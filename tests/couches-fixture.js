// GetCapabilities de test (plus de 40 couches) partagé par les tests Vitest et Playwright du lot 4b-C ; aucune donnée réelle.
const SPECIAUX = [
  { nom: 'ALEARG', titre: 'Aléa retrait-gonflement des argiles', resume: 'Exposition au retrait et au gonflement des sols argileux.' },
  { nom: 'PPRN_COMMUNE_GASPAR', titre: 'Communes couvertes par un plan', resume: 'Liste des communes.' },
  { nom: 'TRI_ZONE_SUBM', titre: 'Zones inondables du TRI', resume: 'Surfaces inondables.' },
  { nom: 'OLD_DEBROUSSAILLEMENT', titre: 'Obligations légales de débroussaillement', resume: 'Zones concernées.' },
  { nom: 'TRIANGLE_TEST', titre: 'Triangle', resume: 'Rien à voir.' },
  { nom: 'ILOT_CHALEUR', titre: 'Îlots de chaleur urbains', resume: 'Température de surface.' },
  { nom: 'Zone inondable & crue', titre: 'Crue « centennale » <test>', resume: 'Entités : &amp;lt; &#233; &#x41; &quot;x&quot; &apos;y&apos; &gt;.' },
  { nom: 'FEU_ET_ARGILES', titre: 'Feu de forêt et retrait des argiles', resume: 'Couche présente dans deux familles.' },
  { nom: 'SANS_FAMILLE', titre: 'Couche sans famille', resume: 'Autre chose.' },
  { nom: 'ALEARG', titre: 'Doublon ignoré', resume: '' },
];

export const NOMS_SPECIAUX = SPECIAUX.map((s) => s.nom);

export function construireCatalogue(nombreGenerees = 36) {
  const generees = Array.from({ length: nombreGenerees }, (_, i) => ({
    nom: `COUCHE_${String(i).padStart(2, '0')}`,
    titre: `Couche générique numéro ${i} (été)`,
    resume: `Résumé ${i}. ${'x'.repeat(i === 5 ? 400 : 10)}`,
  }));
  const toutes = [...SPECIAUX.slice(0, 5), ...generees.slice(0, 18), ...SPECIAUX.slice(5, 9), ...generees.slice(18), SPECIAUX[9]];
  const couche = (c, i) => `<Layer queryable="1"><Name>${c.nom.replace(/&/g, '&amp;')}</Name><Title>${c.titre.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Title><Abstract>${c.resume}</Abstract><CRS>EPSG:3857</CRS><MinScaleDenominator>${i}</MinScaleDenominator><Style><Name>style${i}</Name><Title>Style ${i}</Title></Style></Layer>`;
  return `<?xml version="1.0" encoding="UTF-8"?><WMS_Capabilities version="1.3.0"><Service><Name>WMS</Name><Title>Service</Title></Service><Capability><Layer><Title>Racine</Title><CRS>EPSG:4326</CRS><Layer><Name>GROUPE</Name><Title>Groupe imbriqué</Title>${toutes.map(couche).join('')}</Layer></Layer></Capability></WMS_Capabilities>`;
}
