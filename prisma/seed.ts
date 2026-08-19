import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:password123@localhost:5448/eventgo';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed in local environment...');

  // 1. Clean existing records for idempotent seeding
  console.log('🧹 Cleaning existing tables and events...');
  await prisma.photoLike.deleteMany({});
  await prisma.eventPhoto.deleteMany({});
  await prisma.giftRegistry.deleteMany({});
  await prisma.itineraryItem.deleteMany({});
  await prisma.guest.deleteMany({});
  await prisma.rsvp.deleteMany({});
  await prisma.eventTable.deleteMany({});
  await prisma.event.deleteMany({});

  // 2. Create Main Event: Bautizo de Gael
  console.log('✨ Creating main event: Bautizo de Gael Negrete...');
  const eventBautizo = await prisma.event.create({
    data: {
      slug: 'bautizo',
      title: 'Bautizo de Gael',
      celebrantName: 'Gael Negrete González',
      subtitle: 'Mi Bautizo',
      quote:
        'Acompáñanos a dar gracias a Dios por el maravilloso don de la vida y a celebrar el sacramento del Santo Bautismo.',
      date: new Date('2026-09-19T13:00:00.000Z'),
      heroBackgroundUrl: '/uploads/gael01.jpeg',
      detailsBackgroundUrl: '/uploads/gael02.jpeg',
      rsvpBackgroundUrl: '/uploads/gael01.jpeg',
      parents: 'Carlos Negrete, Laura González',
      godparents: 'Roberto Negrete, Mariana Durán',
      churchName: 'Parroquia de San Juan Bautista',
      churchTime: '1:00 PM',
      churchAddress: 'Av. Madero Poniente 450, Centro Histórico, Morelia, Mich.',
      churchMapsUrl: 'https://maps.google.com/?q=San+Juan+Bautista+Morelia',
      hallName: 'Hacienda Los Laureles - Salón Los Jardines',
      hallTime: '3:00 PM',
      hallAddress: 'Calzada Ventura Puente 1200, Col. Cuauhtémoc, Morelia, Mich.',
      hallMapsUrl: 'https://maps.google.com/?q=Hacienda+Los+Laureles+Morelia',
      locationsAreSame: false,
      dressCode: 'Formal / Guayabera o Traje claro (Evitar color blanco)',
      giftEnvelope: true,
      giftBankName: 'BBVA Bancomer',
      giftBankOwner: 'Carlos Negrete',
      giftBankAccount: '1548920193',
      giftBankClabe: '012180015489201934',
      rsvpPhone: '4431234567',
      rsvpDeadline: new Date('2026-09-05T23:59:59.000Z'),
      itinerary: {
        create: [
          { time: '1:00 PM', activity: 'Ceremonia Religiosa (Misa de Bautizo)' },
          { time: '3:00 PM', activity: 'Recepción y Cóctel de Bienvenida' },
          { time: '4:00 PM', activity: 'Comida Banquetera de 3 Tiempos' },
          { time: '6:00 PM', activity: 'Brindis, Pastel y Fotos Familiares' },
          { time: '7:00 PM', activity: 'Música en Vivo, Dj y Barra Libre' },
        ],
      },
      giftRegistries: {
        create: [
          {
            storeName: 'Liverpool',
            registryNumber: '51489201',
            url: 'https://mesaderegalos.liverpool.com.mx/',
          },
          {
            storeName: 'Amazon México',
            registryNumber: 'GAEL-BAUTIZO-2026',
            url: 'https://www.amazon.com.mx/baby-reg/',
          },
        ],
      },
    },
  });

  // 3. Create Tables for Event Seating Planner
  console.log('🪑 Creating banquet tables...');
  const tableM1 = await prisma.eventTable.create({
    data: {
      eventId: eventBautizo.id,
      name: 'Mesa 1 (Papas & Padrinos)',
      seats: 12,
      side: 'PAPA',
      position: 1,
    },
  });

  const tableM2 = await prisma.eventTable.create({
    data: {
      eventId: eventBautizo.id,
      name: 'Mesa 2 (Familia Negrete)',
      seats: 12,
      side: 'PAPA',
      position: 2,
    },
  });

  const tableM3 = await prisma.eventTable.create({
    data: {
      eventId: eventBautizo.id,
      name: 'Mesa 3 (Amigos Papá)',
      seats: 10,
      side: 'PAPA',
      position: 3,
    },
  });

  const tableM4 = await prisma.eventTable.create({
    data: {
      eventId: eventBautizo.id,
      name: 'Mesa 4 (Familia González)',
      seats: 12,
      side: 'MAMA',
      position: 4,
    },
  });

  const tableM5 = await prisma.eventTable.create({
    data: {
      eventId: eventBautizo.id,
      name: 'Mesa 5 (Familia Durán)',
      seats: 12,
      side: 'MAMA',
      position: 5,
    },
  });

  const tableM6 = await prisma.eventTable.create({
    data: {
      eventId: eventBautizo.id,
      name: 'Mesa 6 (Amigos Mamá)',
      seats: 10,
      side: 'MAMA',
      position: 6,
    },
  });

  // 4. Create Families (RSVPs) and Guests with rich test scenarios
  console.log('👥 Creating RSVP families and guests...');

  const familiesData = [
    // --- LADO PAPÁ ---
    {
      familyName: 'Familia Soria Durán',
      slug: 'soria-duran-28be4cbc',
      invitedBy: 'papa',
      invitationSent: true,
      contactPhone: '4432198765',
      comments: '¡Muchas felicidades! Ahí estaremos puntuales.',
      side: 'PAPA',
      tableId: tableM1.id,
      guests: [
        { name: 'Alejandro Soria', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Mariana Durán', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Mateo Soria', isChild: true, mealType: 'NINO', confirmed: true },
      ],
    },
    {
      familyName: 'Familia Durán Negrete',
      slug: 'duran-negrete-d4e6c354',
      invitedBy: 'papa',
      invitationSent: true,
      contactPhone: '4433124578',
      comments: 'Con mucho gusto acompañamos a Gael.',
      side: 'PAPA',
      tableId: tableM1.id,
      guests: [
        { name: 'Héctor Durán', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Patricia Negrete', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Santiago Durán', isChild: false, mealType: 'ADULTO', confirmed: true },
      ],
    },
    {
      familyName: 'Familia Negrete Gallegos',
      slug: 'negrete-gallegos-ce7310f6',
      invitedBy: 'papa',
      invitationSent: true,
      contactPhone: '4439871234',
      comments: 'El niño prefiere platillo de adulto si es posible.',
      side: 'PAPA',
      tableId: tableM2.id,
      guests: [
        { name: 'Fernando Negrete', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Gabriela Gallegos', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Leonardo Negrete', isChild: true, mealType: 'ADULTO', confirmed: true }, // Niño con platillo adulto (mismatch test)
      ],
    },
    {
      familyName: 'Familia Sandoval Negrete',
      slug: 'sandoval-negrete-a6ce25f6',
      invitedBy: 'papa',
      invitationSent: true,
      contactPhone: '4435551234',
      comments: 'Uno de los adultos prefiere menú infantil.',
      side: 'PAPA',
      tableId: tableM2.id,
      guests: [
        { name: 'Javier Sandoval', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Claudia Negrete', isChild: false, mealType: 'NINO', confirmed: true }, // Adulto con platillo niño (mismatch test)
        { name: 'Sofía Sandoval', isChild: true, mealType: 'NINO', confirmed: true },
      ],
    },
    {
      familyName: 'Familia Castro Negrete',
      slug: 'castro-negrete-3fe76229',
      invitedBy: 'papa',
      invitationSent: false,
      contactPhone: '4434449876',
      comments: '',
      side: 'PAPA',
      tableId: tableM2.id,
      guests: [
        { name: 'Rodrigo Castro', isChild: false, mealType: 'ADULTO', confirmed: null }, // Pendiente
        { name: 'Lucía Negrete', isChild: false, mealType: 'ADULTO', confirmed: null },
      ],
    },
    {
      familyName: 'Familia Macedo Negrete',
      slug: 'macedo-negrete-3bcd8cc4',
      invitedBy: 'papa',
      invitationSent: true,
      contactPhone: '4438887766',
      comments: 'Lamentablemente tenemos un compromiso fuera de la ciudad.',
      side: 'PAPA',
      tableId: null,
      guests: [
        { name: 'Ignacio Macedo', isChild: false, mealType: 'ADULTO', confirmed: false }, // Declinada / No asiste
        { name: 'Teresa Negrete', isChild: false, mealType: 'ADULTO', confirmed: false },
      ],
    },
    {
      familyName: 'Familia Oropeza Negrete',
      slug: 'oropeza-negrete-8003f113',
      invitedBy: 'papa',
      invitationSent: true,
      contactPhone: '4436663322',
      comments: '¡Un abrazo fuerte a los compadres!',
      side: 'PAPA',
      tableId: tableM3.id,
      guests: [
        { name: 'Mauricio Oropeza', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Verónica Negrete', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Camila Oropeza', isChild: true, mealType: 'NINO', confirmed: true },
        { name: 'Diego Oropeza', isChild: true, mealType: 'NINO', confirmed: true },
      ],
    },
    {
      familyName: 'Familia Contreras Negrete',
      slug: 'contreras-negrete-52f61f5d',
      invitedBy: 'papa',
      invitationSent: false,
      contactPhone: '4431112233',
      comments: '',
      side: 'PAPA',
      tableId: null,
      guests: [
        { name: 'Jorge Contreras', isChild: false, mealType: 'ADULTO', confirmed: null },
        { name: 'Daniela Negrete', isChild: false, mealType: 'ADULTO', confirmed: null },
      ],
    },
    {
      familyName: 'Familia Ruiz García',
      slug: 'ruiz-garcia-263a1289',
      invitedBy: 'papa',
      invitationSent: true,
      contactPhone: '4437778899',
      comments: 'Amigos de la universidad de Carlos.',
      side: 'PAPA',
      tableId: tableM3.id,
      guests: [
        { name: 'Arturo Ruiz', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Paulina García', isChild: false, mealType: 'ADULTO', confirmed: true },
      ],
    },

    // --- LADO MAMÁ ---
    {
      familyName: 'Familia González Méndez',
      slug: 'gonzalez-mendez-91a2b3c4',
      invitedBy: 'mama',
      invitationSent: true,
      contactPhone: '4439990011',
      comments: 'Abuelos maternos con mucho amor para Gael.',
      side: 'MAMA',
      tableId: tableM4.id,
      guests: [
        { name: 'Ernesto González', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Rosa María Méndez', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Esteban González', isChild: false, mealType: 'ADULTO', confirmed: true },
      ],
    },
    {
      familyName: 'Familia Torres González',
      slug: 'torres-gonzalez-82b3c4d5',
      invitedBy: 'mama',
      invitationSent: true,
      contactPhone: '4438881122',
      comments: 'Asistiremos con los gemelos.',
      side: 'MAMA',
      tableId: tableM4.id,
      guests: [
        { name: 'Guillermo Torres', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Karla González', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Emiliano Torres', isChild: true, mealType: 'NINO', confirmed: true },
        { name: 'Sebastián Torres', isChild: true, mealType: 'NINO', confirmed: true },
      ],
    },
    {
      familyName: 'Familia Mendoza Ramos',
      slug: 'mendoza-ramos-73c4d5e6',
      invitedBy: 'mama',
      invitationSent: true,
      contactPhone: '4437772233',
      comments: 'Uno de los niños es alérgico al cacahuate.',
      side: 'MAMA',
      tableId: tableM5.id,
      guests: [
        { name: 'Vicente Mendoza', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Adriana Ramos', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Valeria Mendoza', isChild: true, mealType: 'NINO', confirmed: true },
      ],
    },
    {
      familyName: 'Familia Morales González',
      slug: 'morales-gonzalez-64d5e6f7',
      invitedBy: 'mama',
      invitationSent: false,
      contactPhone: '4436664455',
      comments: '',
      side: 'MAMA',
      tableId: null,
      guests: [
        { name: 'Alberto Morales', isChild: false, mealType: 'ADULTO', confirmed: null },
        { name: 'Natalia González', isChild: false, mealType: 'ADULTO', confirmed: null },
        { name: 'Iker Morales', isChild: true, mealType: 'NINO', confirmed: null },
      ],
    },
    {
      familyName: 'Familia Herrera Silva',
      slug: 'herrera-silva-55e6f7a8',
      invitedBy: 'mama',
      invitationSent: true,
      contactPhone: '4435557788',
      comments: 'No podremos asistir por salud, pero les enviamos nuestro regalo.',
      side: 'MAMA',
      tableId: null,
      guests: [
        { name: 'Mario Herrera', isChild: false, mealType: 'ADULTO', confirmed: false },
        { name: 'Elena Silva', isChild: false, mealType: 'ADULTO', confirmed: false },
      ],
    },
    {
      familyName: 'Familia Navarro González',
      slug: 'navarro-gonzalez-46f7a8b9',
      invitedBy: 'mama',
      invitationSent: true,
      contactPhone: '4434441199',
      comments: 'Amigas de la prepa de Laura.',
      side: 'MAMA',
      tableId: tableM6.id,
      guests: [
        { name: 'Paola Navarro', isChild: false, mealType: 'ADULTO', confirmed: true },
        { name: 'Andrea Gómez', isChild: false, mealType: 'ADULTO', confirmed: true },
      ],
    },

    // --- BEBÉS / PADRINOS ESPECIALES ---
    {
      familyName: 'Familia Bebés & Amiguitos',
      slug: 'bebes-amiguitos-37a8b9c0',
      invitedBy: 'bebes',
      invitationSent: true,
      contactPhone: '4433338811',
      comments: 'Mesa de juegos para los más pequeños.',
      side: 'MAMA',
      tableId: tableM6.id,
      guests: [
        { name: 'Luciana Paredes', isChild: true, mealType: 'NINO', confirmed: true },
        { name: 'Matías Paredes', isChild: true, mealType: 'NINO', confirmed: true },
      ],
    },
  ];

  for (const f of familiesData) {
    const { guests, ...rsvpFields } = f;
    await prisma.rsvp.create({
      data: {
        ...rsvpFields,
        eventId: eventBautizo.id,
        guests: {
          create: guests,
        },
      },
    });
  }

  // 5. Create Secondary Event: 1er Cumpleaños de Gael (to test multi-event dashboard)
  console.log('🎂 Creating secondary event: 1er Cumpleaños...');
  await prisma.event.create({
    data: {
      slug: 'cumple-gael',
      title: '1er Cumpleaños de Gael',
      celebrantName: 'Gael Negrete',
      subtitle: '¡Mi Primer Añito!',
      quote: 'Ven a divertirte con nosotros en una tarde llena de juegos, piñatas y sorpresas.',
      date: new Date('2026-10-24T16:00:00.000Z'),
      hallName: 'Salón Infantil Splash & Fun',
      hallTime: '4:00 PM',
      hallAddress: 'Av. Acueducto 789, Morelia, Mich.',
      hallMapsUrl: 'https://maps.google.com',
      locationsAreSame: true,
      dressCode: 'Casual / Temática Selva Safari',
      giftEnvelope: false,
      rsvpPhone: '4431234567',
      rsvpDeadline: new Date('2026-10-15T23:59:59.000Z'),
      itinerary: {
        create: [
          { time: '4:00 PM', activity: 'Llegada y Pintacaritas' },
          { time: '5:30 PM', activity: 'Show Infantil y Piñatas' },
          { time: '6:30 PM', activity: 'Pastel y Mañanitas' },
        ],
      },
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('📊 Summary:');
  console.log(` - Event: "${eventBautizo.title}" (slug: /e/bautizo)`);
  console.log(` - Tables created: 6 banquet tables (PAPA / MAMA)`);
  console.log(` - Families registered: ${familiesData.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
