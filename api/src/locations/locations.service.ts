import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessStatus, EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  getTurkishProvinceName,
  isValidTurkishPostalCode,
} from '../common/postal-country.util';

interface PlzLocality {
  name: string;
  postalCode: string;
  municipality?: { name: string };
  district?: { name: string };
  federalState?: { name: string };
}

// Almanya federal eyalet isimlerini DB slug'larına eşleştir
const STATE_SLUG_MAP: Record<string, string> = {
  'Baden-Württemberg': 'baden-wuerttemberg',
  'Bayern': 'bayern',
  'Berlin': 'berlin',
  'Brandenburg': 'brandenburg',
  'Bremen': 'bremen',
  'Hamburg': 'hamburg',
  'Hessen': 'hessen',
  'Mecklenburg-Vorpommern': 'mecklenburg-vorpommern',
  'Niedersachsen': 'niedersachsen',
  'Nordrhein-Westfalen': 'nordrhein-westfalen',
  'Rheinland-Pfalz': 'rheinland-pfalz',
  'Saarland': 'saarland',
  'Sachsen': 'sachsen',
  'Sachsen-Anhalt': 'sachsen-anhalt',
  'Schleswig-Holstein': 'schleswig-holstein',
  'Thüringen': 'thueringen',
};

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  findStates() {
    return this.prisma.federalState.findMany({
      orderBy: { name: 'asc' },
      include: {
        cities: { orderBy: { name: 'asc' } },
        _count: { select: { cities: true } },
      },
    });
  }

  findStateBySlug(slug: string) {
    return this.prisma.federalState.findUnique({
      where: { slug },
      include: { cities: { orderBy: { name: 'asc' } } },
    });
  }

  findCities(stateId?: string) {
    return this.prisma.city.findMany({
      where: stateId ? { stateId } : undefined,
      orderBy: { name: 'asc' },
      include: { state: true },
    });
  }

  async lookupPostalCode(plz: string) {
    const url = `https://openplzapi.org/de/Localities?postalCode=${plz}&page=1&pageSize=1`;
    let locality: PlzLocality | null = null;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data: PlzLocality[] = await res.json();
        locality = data[0] ?? null;
      }
    } catch {
      // API erişilemez — sadece null dön
    }

    if (!locality) {
      return { found: false, state: null, city: null };
    }

    const stateName = locality.federalState?.name ?? '';
    const localityName = locality.name;
    const municipalityName = locality.municipality?.name ?? '';

    // DB'deki eyaleti bul (slug haritası + isim eşleşmesi)
    const stateSlug = STATE_SLUG_MAP[stateName];
    let state = stateSlug
      ? await this.prisma.federalState.findUnique({ where: { slug: stateSlug } })
      : null;
    if (!state && stateName) {
      state = await this.prisma.federalState.findFirst({
        where: { name: { equals: stateName, mode: 'insensitive' } },
      });
    }

    let city = null;
    if (state) {
      // Arama adayları: locality adı, municipality adı ve kısaltmalar
      const candidates = [
        localityName,
        municipalityName,
        localityName.split(' ')[0],
        municipalityName.split(' ')[0],
      ].filter((v, i, a) => v && a.indexOf(v) === i); // tekrarsız, boşsuz

      for (const candidate of candidates) {
        // Önce tam eşleşme dene
        city = await this.prisma.city.findFirst({
          where: { stateId: state.id, name: { equals: candidate, mode: 'insensitive' } },
        });
        if (city) break;

        // Kısmi eşleşme dene
        city = await this.prisma.city.findFirst({
          where: { stateId: state.id, name: { contains: candidate, mode: 'insensitive' } },
        });
        if (city) break;
      }
    }

    return {
      found: true,
      postalCode: plz,
      localityName,
      municipalityName,
      stateName: stateName || undefined,
      state: state ?? null,
      city: city ?? null,
    };
  }

  lookupTurkishPostalCode(plz: string) {
    if (!isValidTurkishPostalCode(plz)) {
      return { found: false, provinceName: null, postalCode: plz };
    }
    return {
      found: true,
      postalCode: plz,
      provinceName: getTurkishProvinceName(plz),
    };
  }

  async findCityBySlug(slug: string) {
    const city = await this.prisma.city.findFirst({
      where: { slug },
      include: { state: true },
    });
    if (!city) throw new NotFoundException('Şehir bulunamadı');

    const [events, topics, businesses, topicCount, businessCount] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          deletedAt: null,
          status: EventStatus.PUBLISHED,
          cityId: city.id,
          startsAt: { gte: new Date() },
        },
        take: 6,
        orderBy: { startsAt: 'asc' },
        include: {
          city: true,
          state: true,
          _count: { select: { attendees: true } },
        },
      }),
      this.prisma.forumTopic.findMany({
        where: { deletedAt: null, cityId: city.id },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          city: true,
          state: true,
          _count: { select: { replies: true, interests: true } },
        },
      }),
      this.prisma.business.findMany({
        where: {
          deletedAt: null,
          status: BusinessStatus.ACTIVE,
          cityId: city.id,
        },
        take: 6,
        orderBy: [{ isVerified: 'desc' }, { averageRating: 'desc' }],
        include: { category: true, city: true },
      }),
      this.prisma.forumTopic.count({ where: { deletedAt: null, cityId: city.id } }),
      this.prisma.business.count({
        where: { deletedAt: null, status: BusinessStatus.ACTIVE, cityId: city.id },
      }),
    ]);

    return {
      city,
      events,
      topics,
      businesses,
      stats: { topicCount, businessCount },
    };
  }
}
