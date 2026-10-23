import fs from 'node:fs';
import path from 'node:path';

const MAMIFEROS = [
  {
    id: 1,
    name: 'Jaguar',
    sci_name: 'Panthera onca',
    family: 'Felidae',
    region: 'América',
    photo: 'https://static.inaturalist.org/photos/51015966/medium.jpg'
  },
  {
    id: 2,
    name: 'Tigre de Bengala',
    sci_name: 'Panthera tigris',
    family: 'Felidae',
    region: 'Asia',
    photo: 'https://static.inaturalist.org/photos/47940173/medium.jpg'
  },
  {
    id: 3,
    name: 'León Africano',
    sci_name: 'Panthera leo',
    family: 'Felidae',
    region: 'África',
    photo: 'https://static.inaturalist.org/photos/22194686/medium.jpg'
  },
  {
    id: 4,
    name: 'Leopardo de las Nieves',
    sci_name: 'Panthera uncia',
    family: 'Felidae',
    region: 'Asia Central',
    photo: 'https://static.inaturalist.org/photos/4014138/medium.jpg'
  },
  {
    id: 5,
    name: 'Guepardo',
    sci_name: 'Acinonyx jubatus',
    family: 'Felidae',
    region: 'África',
    photo: 'https://static.inaturalist.org/photos/54366613/medium.jpg'
  },
  {
    id: 6,
    name: 'Puma',
    sci_name: 'Puma concolor',
    family: 'Felidae',
    region: 'América',
    photo: 'https://static.inaturalist.org/photos/6398934/medium.jpg'
  },
  {
    id: 7,
    name: 'Lobo Gris',
    sci_name: 'Canis lupus',
    family: 'Canidae',
    region: 'Holarctis',
    photo: 'https://static.inaturalist.org/photos/3472019/medium.jpg'
  },
  {
    id: 8,
    name: 'Oso Polar',
    sci_name: 'Ursus maritimus',
    family: 'Ursidae',
    region: 'Ártico',
    photo: 'https://static.inaturalist.org/photos/65171780/medium.jpg'
  },
  {
    id: 9,
    name: 'Oso Pardo',
    sci_name: 'Ursus arctos',
    family: 'Ursidae',
    region: 'Eurasia y Norteamérica',
    photo: 'https://static.inaturalist.org/photos/25925345/medium.jpg'
  },
  {
    id: 10,
    name: 'Panda Gigante',
    sci_name: 'Ailuropoda melanoleuca',
    family: 'Ursidae',
    region: 'Asia',
    photo: 'https://static.inaturalist.org/photos/3055415/medium.jpg'
  },
  {
    id: 11,
    name: 'Elefante Africano',
    sci_name: 'Loxodonta africana',
    family: 'Elephantidae',
    region: 'África',
    photo: 'https://static.inaturalist.org/photos/56084560/medium.jpg'
  },
  {
    id: 12,
    name: 'Rinoceronte Blanco',
    sci_name: 'Ceratotherium simum',
    family: 'Rhinocerotidae',
    region: 'África',
    photo: 'https://static.inaturalist.org/photos/10328905/medium.jpg'
  },
  {
    id: 13,
    name: 'Jirafa',
    sci_name: 'Giraffa camelopardalis',
    family: 'Giraffidae',
    region: 'África',
    photo: 'https://static.inaturalist.org/photos/16886478/medium.jpg'
  },
  {
    id: 14,
    name: 'Gorila de Montaña',
    sci_name: 'Gorilla beringei',
    family: 'Hominidae',
    region: 'África',
    photo: 'https://static.inaturalist.org/photos/3983758/medium.jpg'
  },
  {
    id: 15,
    name: 'Zorro Rojo',
    sci_name: 'Vulpes vulpes',
    family: 'Canidae',
    region: 'Holarctis',
    photo: 'https://static.inaturalist.org/photos/16605797/medium.jpg'
  },
  {
    id: 16,
    name: 'Nutria Gigante',
    sci_name: 'Pteronura brasiliensis',
    family: 'Mustelidae',
    region: 'Sudamérica',
    photo: 'https://static.inaturalist.org/photos/5536412/medium.jpg'
  }
];

const FLORES = [
  {
    id: 1,
    name: 'Orquídea Cattleya',
    sci_name: 'Cattleya trianae',
    family: 'Orchidaceae',
    region: 'América Tropical',
    photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/40082393/medium.jpg'
  },
  {
    id: 2,
    name: 'Pasionaria Azufrada',
    sci_name: 'Passiflora caerulea',
    family: 'Passifloraceae',
    region: 'Sudamérica',
    photo: 'https://static.inaturalist.org/photos/25501784/medium.jpg'
  },
  {
    id: 3,
    name: 'Flor de Loto Sagrado',
    sci_name: 'Nelumbo nucifera',
    family: 'Nelumbonaceae',
    region: 'Asia',
    photo: 'https://static.inaturalist.org/photos/21175654/medium.jpg'
  },
  {
    id: 4,
    name: 'Flor de Cerezo (Sakura)',
    sci_name: 'Prunus serrulata',
    family: 'Rosaceae',
    region: 'Asia',
    photo: 'https://static.inaturalist.org/photos/36676831/medium.jpg'
  },
  {
    id: 5,
    name: 'Rosa Silvestre',
    sci_name: 'Rosa canina',
    family: 'Rosaceae',
    region: 'Europa y Asia',
    photo: 'https://static.inaturalist.org/photos/20340795/medium.jpg'
  },
  {
    id: 6,
    name: 'Ave del Paraíso',
    sci_name: 'Strelitzia reginae',
    family: 'Strelitziaceae',
    region: 'Sudáfrica',
    photo: 'https://static.inaturalist.org/photos/37748446/medium.jpg'
  },
  {
    id: 7,
    name: 'Girasol Silvestre',
    sci_name: 'Helianthus annuus',
    family: 'Asteraceae',
    region: 'Norteamérica',
    photo: 'https://static.inaturalist.org/photos/23602284/medium.jpg'
  },
  {
    id: 8,
    name: 'Lavanda Silvestre',
    sci_name: 'Lavandula angustifolia',
    family: 'Lamiaceae',
    region: 'Mediterráneo',
    photo: 'https://static.inaturalist.org/photos/22530132/medium.jpg'
  },
  {
    id: 9,
    name: 'Hibisco de Jardín',
    sci_name: 'Hibiscus rosa-sinensis',
    family: 'Malvaceae',
    region: 'Asia Tropical',
    photo: 'https://static.inaturalist.org/photos/15509748/medium.jpg'
  },
  {
    id: 10,
    name: 'Nenúfar Blanco',
    sci_name: 'Nymphaea alba',
    family: 'Nymphaeaceae',
    region: 'Europa y Norte de África',
    photo: 'https://static.inaturalist.org/photos/21650346/medium.jpg'
  },
  {
    id: 11,
    name: 'Dalia Silvestre',
    sci_name: 'Dahlia pinnata',
    family: 'Asteraceae',
    region: 'México y Centroamérica',
    photo: 'https://static.inaturalist.org/photos/45028448/medium.jpg'
  },
  {
    id: 12,
    name: 'Magnolia Blanca',
    sci_name: 'Magnolia grandiflora',
    family: 'Magnoliaceae',
    region: 'Norteamérica',
    photo: 'https://static.inaturalist.org/photos/19612349/medium.jpg'
  },
  {
    id: 13,
    name: 'Amapola Silvestre',
    sci_name: 'Papaver rhoeas',
    family: 'Papaveraceae',
    region: 'Eurasia',
    photo: 'https://static.inaturalist.org/photos/20658498/medium.jpg'
  },
  {
    id: 14,
    name: 'Hortensia Azul',
    sci_name: 'Hydrangea macrophylla',
    family: 'Hydrangeaceae',
    region: 'Japón',
    photo: 'https://static.inaturalist.org/photos/21568940/medium.jpg'
  },
  {
    id: 15,
    name: 'Peonía China',
    sci_name: 'Paeonia lactiflora',
    family: 'Paeoniaceae',
    region: 'Asia Central y Oriental',
    photo: 'https://static.inaturalist.org/photos/18524410/medium.jpg'
  },
  {
    id: 16,
    name: 'Jazmín del Cabo',
    sci_name: 'Gardenia jasminoides',
    family: 'Rubiaceae',
    region: 'Asia',
    photo: 'https://static.inaturalist.org/photos/33580459/medium.jpg'
  }
];

const outDir = path.resolve('public/data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'mamiferos.json'), JSON.stringify(MAMIFEROS, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'flores.json'), JSON.stringify(FLORES, null, 2), 'utf-8');
console.log('Datasets de Mamíferos y Flores guardados en public/data/.');
