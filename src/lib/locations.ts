export const KIGALI_DISTRICTS: Record<string, { lat: number; lng: number }> = {
  Kimironko: { lat: -1.9490, lng: 30.1200 },
  Kibagabaga: { lat: -1.9440, lng: 30.1040 },
  Remera: { lat: -1.9590, lng: 30.1100 },
  Kacyiru: { lat: -1.9380, lng: 30.0920 },
  Gisozi: { lat: -1.9200, lng: 30.0800 },
  Ndera: { lat: -1.9100, lng: 30.1400 },
  Rusororo: { lat: -1.8900, lng: 30.1300 },
  Jabana: { lat: -1.8700, lng: 30.1000 },
  Bumbogo: { lat: -1.8600, lng: 30.0900 },
  Gatsata: { lat: -1.9300, lng: 30.0700 },
  Gikomero: { lat: -1.8800, lng: 30.1600 },
  Jali: { lat: -1.9000, lng: 30.1700 },
  Kinyinya: { lat: -1.9350, lng: 30.1350 },
  Ntarama: { lat: -1.9600, lng: 30.1500 },
  Rutunga: { lat: -1.9150, lng: 30.0650 },
  Bibare: { lat: -1.9250, lng: 30.1450 },
  Kicukiro: { lat: -1.9700, lng: 30.0900 },
  Gatenga: { lat: -1.9800, lng: 30.0850 },
  Gikondo: { lat: -1.9750, lng: 30.0700 },
  Kagarama: { lat: -1.9850, lng: 30.0950 },
  Kanombe: { lat: -1.9680, lng: 30.1350 },
  Kigarama: { lat: -1.9900, lng: 30.1000 },
  Masaka: { lat: -2.0100, lng: 30.0900 },
  Niboye: { lat: -1.9950, lng: 30.0800 },
  Nyarugunga: { lat: -1.9600, lng: 30.1200 },
  Rwarenga: { lat: -2.0000, lng: 30.1100 },
  Nyarugenge: { lat: -1.9550, lng: 30.0620 },
  Gitega: { lat: -1.9550, lng: 30.0580 },
  Kanyinya: { lat: -1.9400, lng: 30.0500 },
  Kigali: { lat: -1.9441, lng: 30.0619 },
  Kimisagara: { lat: -1.9600, lng: 30.0550 },
  Mageragere: { lat: -1.9700, lng: 30.0400 },
  Muhima: { lat: -1.9500, lng: 30.0650 },
  Nyakabanda: { lat: -1.9450, lng: 30.0700 },
  Nyamirambo: { lat: -1.9700, lng: 30.0500 },
  Rwezamenyo: { lat: -1.9650, lng: 30.0600 },
}

export const VILLE_COORDS: Record<string, { lat: number; lng: number }> = {
  Kigali: { lat: -1.9441, lng: 30.0619 },
  Butare: { lat: -2.5967, lng: 29.7392 },
  Musanze: { lat: -1.4994, lng: 29.6349 },
  Gisenyi: { lat: -1.7025, lng: 29.2567 },
  Rubavu: { lat: -1.7025, lng: 29.2567 },
  Cyangugu: { lat: -2.4847, lng: 28.9077 },
  Rusizi: { lat: -2.4847, lng: 28.9077 },
  Huye: { lat: -2.5967, lng: 29.7392 },
  Nyagatare: { lat: -1.2985, lng: 30.3285 },
  Muhanga: { lat: -2.0836, lng: 29.7511 },
  Rwamagana: { lat: -1.9494, lng: 30.4344 },
  Byumba: { lat: -1.5756, lng: 30.0677 },
  Kibuye: { lat: -2.0603, lng: 29.3497 },
  Karongi: { lat: -2.0603, lng: 29.3497 },
}

function deterministicOffset(id: string, index: number): number {
  const char1 = id.charCodeAt(index % id.length) || 0
  const char2 = id.charCodeAt((index + 3) % id.length) || 0
  return ((char1 * char2) % 100) / 100 * 0.004 - 0.002
}

export function getApproxCoords(
  province?: string | null,
  district?: string | null,
  listingId?: string | null
): { lat: number; lng: number } | null {
  if (!province && !district) return null
  const id = listingId || 'default'

  if (district) {
    const districtClean = district.trim().toLowerCase()
    const districtKey = Object.keys(KIGALI_DISTRICTS).find(
      key => key.toLowerCase() === districtClean
    )
    if (districtKey) {
      const base = KIGALI_DISTRICTS[districtKey]
      return {
        lat: base.lat + deterministicOffset(id, 0),
        lng: base.lng + deterministicOffset(id, 1),
      }
    }
  }

  if (province) {
    const provinceClean = province.trim().toLowerCase()
    const villeKey = Object.keys(VILLE_COORDS).find(
      key => key.toLowerCase() === provinceClean
    )
    if (villeKey) {
      const base = VILLE_COORDS[villeKey]
      return {
        lat: base.lat + deterministicOffset(id, 0),
        lng: base.lng + deterministicOffset(id, 1),
      }
    }
  }

  return {
    lat: -1.9441 + deterministicOffset(id, 0),
    lng: 30.0619 + deterministicOffset(id, 1),
  }
}
