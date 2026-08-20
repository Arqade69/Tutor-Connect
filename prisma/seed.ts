import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Tutor-Connect database...");

  // ------------------------------------------------------------------
  //  Demo accounts (used by the one-click "Try as Demo ..." login buttons)
  // ------------------------------------------------------------------
  const demoStudent = await prisma.user.upsert({
    where: { email: "demo-student@tutorconnect.local" },
    update: {},
    create: {
      email: "demo-student@tutorconnect.local",
      name: "Ayesha Siddiqua",
      role: "student",
      onboarded: true,
      phone: "01711223344",
      location: "Mohakhali",
      district: "Dhaka",
      isPremium: true,
      academicInfo: {
        create: [
          {
            currentClass: "HSC",
            institution: "Viqarunnisa Noon College",
            subjects: "Physics, Chemistry, Biology",
          },
        ],
      },
    },
  });

  const demoParent = await prisma.user.upsert({
    where: { email: "demo-parent@tutorconnect.local" },
    update: {},
    create: {
      email: "demo-parent@tutorconnect.local",
      name: "Karim Uddin",
      role: "parent",
      onboarded: true,
      phone: "01822334455",
      location: "Dhanmondi",
      district: "Dhaka",
      studentProfiles: {
        create: [
          {
            studentName: "Rafi Uddin",
            currentClass: "SSC",
            institution: "St. Gregory's High School",
            subjects: "Math, English",
          },
          {
            studentName: "Sadia Uddin",
            currentClass: "O-Level",
            institution: "Sunbeams School",
            subjects: "Math, Physics",
          },
        ],
      },
    },
  });

  const demoAdmin = await prisma.user.upsert({
    where: { email: "demo-admin@tutorconnect.local" },
    update: {},
    create: {
      email: "demo-admin@tutorconnect.local",
      name: "Platform Admin",
      role: "admin",
      onboarded: true,
      phone: "01900000000",
      location: "Gulshan",
      district: "Dhaka",
    },
  });

  // Main Demo Tutor
  const demoTutorUser = await prisma.user.upsert({
    where: { email: "demo-tutor@tutorconnect.local" },
    update: {
      name: "Farkhanda Haque Neesa",
      location: "Dhanmondi",
      district: "Dhaka",
    },
    create: {
      email: "demo-tutor@tutorconnect.local",
      name: "Farkhanda Haque Neesa",
      role: "tutor",
      onboarded: true,
      phone: "01933445566",
      location: "Dhanmondi",
      district: "Dhaka",
    },
  });

  const demoTutorProfile = await prisma.tutorProfile.upsert({
    where: { userId: demoTutorUser.id },
    update: {
      tagline: "Senior Physics Educator | 10+ Years Experience",
      bio: "Specializing in SSC and HSC Physics & Higher Math. I focus on conceptual understanding, problem-solving techniques, and board exam prep.",
      subjects: ["Physics", "Higher Math", "General Math"],
      classLevels: ["SSC", "HSC", "Admission (Uni)"],
      medium: "Both",
      hourlyFee: 800,
      verificationStatus: "approved",
      isPublic: true,
    },
    create: {
      userId: demoTutorUser.id,
      tagline: "Senior Physics Educator | 10+ Years Experience",
      bio: "Specializing in SSC and HSC Physics & Higher Math. I focus on conceptual understanding, problem-solving techniques, and board exam prep.",
      subjects: ["Physics", "Higher Math", "General Math"],
      classLevels: ["SSC", "HSC", "Admission (Uni)"],
      medium: "Both",
      hourlyFee: 800,
      verificationStatus: "approved",
      isPublic: true,
    },
  });

  // Additional Tutors for rich search & filtering testing
  const additionalTutorsData = [
    {
      email: "tanvir.chemistry@tutorconnect.local",
      name: "Dr. Tanvir Rahman",
      phone: "01755667788",
      location: "Uttara",
      district: "Dhaka",
      tagline: "BUET Alumnus | Organic & Physical Chemistry Specialist",
      bio: "PhD in Chemical Sciences. 8 years teaching experience in HSC Chemistry and Medical/Engineering Admission prep.",
      subjects: ["Chemistry", "Biology"],
      classLevels: ["HSC", "Admission (Uni)"],
      medium: "English",
      hourlyFee: 1200,
      verificationStatus: "approved",
    },
    {
      email: "sharmin.english@tutorconnect.local",
      name: "Sharmin Akter",
      phone: "01866778899",
      location: "Panchlaish",
      district: "Chattogram",
      tagline: "IELTS 8.5 | O/A Level English Language & Literature",
      bio: "Empowering students in English communication, grammar, essay writing, and international standardized exams.",
      subjects: ["English", "IELTS"],
      classLevels: ["O-Level", "A-Level", "Class 1-8"],
      medium: "English",
      hourlyFee: 1000,
      verificationStatus: "approved",
    },
    {
      email: "mahmud.math@tutorconnect.local",
      name: "Engr. Mahmudul Hasan",
      phone: "01977889900",
      location: "Zindabazar",
      district: "Sylhet",
      tagline: "Competitive Math & Programming Mentor",
      bio: "Software Engineer passionate about teaching Mathematics, ICT, and Computer Programming fundamentals to school and college students.",
      subjects: ["Higher Math", "General Math", "ICT", "Programming"],
      classLevels: ["SSC", "HSC", "A-Level"],
      medium: "Bangla",
      hourlyFee: 650,
      verificationStatus: "approved",
    },
  ];

  const allTutorProfiles = [demoTutorProfile];

  for (const t of additionalTutorsData) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        name: t.name,
        role: "tutor",
        onboarded: true,
        phone: t.phone,
        location: t.location,
        district: t.district,
      },
    });

    const prof = await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        tagline: t.tagline,
        bio: t.bio,
        subjects: t.subjects,
        classLevels: t.classLevels,
        medium: t.medium,
        hourlyFee: t.hourlyFee,
        verificationStatus: t.verificationStatus,
        isPublic: true,
      },
    });

    allTutorProfiles.push(prof);
  }

  // Seed Availability Slots for all tutors
  const slotsConfig = [
    { dayOfWeek: "Saturday", startTime: "10:00", endTime: "11:30" },
    { dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00" },
    { dayOfWeek: "Sunday", startTime: "17:00", endTime: "19:00" },
    { dayOfWeek: "Monday", startTime: "16:00", endTime: "18:00" },
    { dayOfWeek: "Tuesday", startTime: "18:00", endTime: "20:00" },
    { dayOfWeek: "Wednesday", startTime: "15:00", endTime: "17:00" },
    { dayOfWeek: "Thursday", startTime: "17:00", endTime: "19:00" },
    { dayOfWeek: "Friday", startTime: "10:00", endTime: "12:00" },
  ];

  for (const profile of allTutorProfiles) {
    for (const slot of slotsConfig) {
      await prisma.availabilitySlot.upsert({
        where: {
          tutorId_dayOfWeek_startTime_endTime: {
            tutorId: profile.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        },
        update: {},
        create: {
          tutorId: profile.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: false,
        },
      });
    }
  }

  // Seed Sample Bookings (Wipe all previous test bookings & reviews first —
  // reviews cascade-delete with their booking, but clear explicitly for clarity)
  await prisma.review.deleteMany({ where: { tutorId: demoTutorProfile.id } });
  await prisma.booking.deleteMany({});

  // Add historical completed sessions across 2025 and 2026 to populate analytics dashboard
  const historicalCompletedSessions = [
    // 2025 Sessions
    { date: "2025-11-08", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2025-11-15", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2025-12-06", dayOfWeek: "Saturday", startTime: "10:00", endTime: "12:00", subject: "Higher Math", bookingType: "monthly" },
    { date: "2025-12-13", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2025-12-20", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "General Math", bookingType: "one_time" },

    // 2026 Sessions (Jan - Aug)
    { date: "2026-01-10", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-01-17", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-01-24", dayOfWeek: "Saturday", startTime: "10:00", endTime: "11:30", subject: "Higher Math", bookingType: "one_time" },
    { date: "2026-02-07", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-02-14", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-02-21", dayOfWeek: "Saturday", startTime: "10:00", endTime: "11:30", subject: "General Math", bookingType: "one_time" },
    { date: "2026-03-07", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "monthly" },
    { date: "2026-03-14", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "monthly" },
    { date: "2026-03-21", dayOfWeek: "Saturday", startTime: "10:00", endTime: "12:00", subject: "Higher Math", bookingType: "one_time" },
    { date: "2026-03-28", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-04-04", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-04-11", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-04-18", dayOfWeek: "Saturday", startTime: "10:00", endTime: "12:00", subject: "General Math", bookingType: "one_time" },
    { date: "2026-05-02", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "monthly" },
    { date: "2026-05-09", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "monthly" },
    { date: "2026-05-16", dayOfWeek: "Monday", startTime: "16:00", endTime: "18:00", subject: "Higher Math", bookingType: "one_time" },
    { date: "2026-05-23", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-06-06", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-06-13", dayOfWeek: "Monday", startTime: "16:00", endTime: "18:00", subject: "Higher Math", bookingType: "one_time" },
    { date: "2026-06-20", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-07-04", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "monthly" },
    { date: "2026-07-11", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "monthly" },
    { date: "2026-07-18", dayOfWeek: "Monday", startTime: "16:00", endTime: "18:00", subject: "Higher Math", bookingType: "one_time" },
    { date: "2026-07-25", dayOfWeek: "Tuesday", startTime: "18:00", endTime: "20:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-08-01", dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", subject: "Physics", bookingType: "one_time" },
    { date: "2026-08-08", dayOfWeek: "Monday", startTime: "16:00", endTime: "18:00", subject: "Higher Math", bookingType: "one_time" },
  ];

  // Keep references to the created rows — reviews below link to specific
  // ones of these via bookingId (Review.bookingId is required + unique, so
  // every review must point at a real completed session).
  const studentCompletedBookings: { id: string; date: string }[] = [];
  for (const s of historicalCompletedSessions) {
    const created = await prisma.booking.create({
      data: {
        studentId: demoStudent.id,
        tutorId: demoTutorProfile.id,
        date: s.date,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject,
        notes: `Completed tutoring session on ${s.subject}`,
        bookingType: s.bookingType,
        status: "completed",
        createdAt: new Date(`${s.date}T10:00:00Z`),
      },
    });
    studentCompletedBookings.push({ id: created.id, date: created.date });
  }

  // A couple of completed sessions booked directly by the demo parent, so
  // their reviews below also point at a genuine completed booking of theirs.
  const parentCompletedSessions = [
    { date: "2026-03-18", dayOfWeek: "Wednesday", startTime: "15:00", endTime: "17:00", subject: "Higher Math", bookingType: "monthly" },
    { date: "2026-07-01", dayOfWeek: "Wednesday", startTime: "15:00", endTime: "17:00", subject: "Physics", bookingType: "one_time" },
  ];

  const parentCompletedBookings: { id: string; date: string }[] = [];
  for (const s of parentCompletedSessions) {
    const created = await prisma.booking.create({
      data: {
        studentId: demoParent.id,
        tutorId: demoTutorProfile.id,
        date: s.date,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject,
        notes: `Completed tutoring session on ${s.subject}`,
        bookingType: s.bookingType,
        status: "completed",
        createdAt: new Date(`${s.date}T10:00:00Z`),
      },
    });
    parentCompletedBookings.push({ id: created.id, date: created.date });
  }

  const findByDate = (rows: { id: string; date: string }[], date: string) =>
    rows.find((r) => r.date === date)?.id;

  // Seed Reviews for Demo Tutor across multiple months to demonstrate rating
  // trends over time — each one tied to one of the completed bookings above.
  const historicalReviews = [
    {
      authorId: demoStudent.id,
      bookingId: findByDate(studentCompletedBookings, "2026-01-17"),
      rating: 5,
      comment: "Excellent tutor! Explains complex Physics topics with simple real-life examples.",
      createdAt: new Date("2026-01-18T10:00:00Z"),
    },
    {
      authorId: demoParent.id,
      bookingId: findByDate(parentCompletedBookings, "2026-03-18"),
      rating: 4,
      comment: "Very dedicated teacher. Helped my child improve in Vectors & Calculus.",
      createdAt: new Date("2026-03-19T14:30:00Z"),
    },
    {
      authorId: demoStudent.id,
      bookingId: findByDate(studentCompletedBookings, "2026-05-09"),
      rating: 5,
      comment: "Outstanding HSC Physics preparation. Highly recommended!",
      createdAt: new Date("2026-05-10T09:15:00Z"),
    },
    {
      authorId: demoParent.id,
      bookingId: findByDate(parentCompletedBookings, "2026-07-01"),
      rating: 5,
      comment: "Punctual, thorough, and highly professional.",
      createdAt: new Date("2026-07-02T16:00:00Z"),
    },
    {
      authorId: demoStudent.id,
      bookingId: findByDate(studentCompletedBookings, "2026-08-08"),
      rating: 5,
      comment: "Great step-by-step problem-solving technique for Higher Math.",
      createdAt: new Date("2026-08-09T11:20:00Z"),
    },
  ];

  for (const r of historicalReviews) {
    if (!r.bookingId) continue; // defensive — skip if the matching booking wasn't found
    await prisma.review.create({
      data: {
        tutorId: demoTutorProfile.id,
        authorId: r.authorId,
        bookingId: r.bookingId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      },
    });
  }

  // Upcoming confirmed session
  const satSlot = await prisma.availabilitySlot.findFirst({
    where: { tutorId: demoTutorProfile.id, dayOfWeek: "Saturday" },
  });

  if (satSlot) {
    await prisma.booking.create({
      data: {
        studentId: demoStudent.id,
        tutorId: demoTutorProfile.id,
        slotId: satSlot.id,
        date: "2026-08-15",
        dayOfWeek: "Saturday",
        startTime: satSlot.startTime,
        endTime: satSlot.endTime,
        subject: "Physics",
        notes: "Need help preparing for upcoming HSC Vector & Dynamics chapter test.",
        bookingType: "one_time",
        status: "confirmed",
      },
    });
  }

  const monSlot = await prisma.availabilitySlot.findFirst({
    where: { tutorId: demoTutorProfile.id, dayOfWeek: "Monday" },
  });

  if (monSlot) {
    await prisma.booking.create({
      data: {
        studentId: demoParent.id,
        tutorId: demoTutorProfile.id,
        slotId: monSlot.id,
        date: "2026-08-17",
        dayOfWeek: "Monday",
        startTime: monSlot.startTime,
        endTime: monSlot.endTime,
        subject: "Higher Math",
        notes: "Monthly subscription package session for SSC Trigonometry.",
        bookingType: "monthly",
        status: "pending",
      },
    });
  }

  // Seed Chat Conversation & Messages between Demo Student and Demo Tutor
  let conv = await prisma.conversation.findFirst({
    where: {
      OR: [
        { participant1Id: demoStudent.id, participant2Id: demoTutorUser.id },
        { participant1Id: demoTutorUser.id, participant2Id: demoStudent.id },
      ],
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        participant1Id: demoStudent.id,
        participant2Id: demoTutorUser.id,
      },
    });
  }

  await prisma.message.deleteMany({ where: { conversationId: conv.id } });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv.id,
        senderId: demoStudent.id,
        text: "Assalamu Alaikum Ma'am! Are you available for HSC Physics tutoring this weekend?",
        createdAt: new Date(Date.now() - 3600000 * 5),
      },
      {
        conversationId: conv.id,
        senderId: demoTutorUser.id,
        text: "Wa Alaikum Assalam Ayesha! Yes, I have a slot available on Saturday at 4:00 PM.",
        createdAt: new Date(Date.now() - 3600000 * 4),
      },
      {
        conversationId: conv.id,
        senderId: demoStudent.id,
        text: "Great! I have booked the Saturday slot for the Vectors chapter.",
        createdAt: new Date(Date.now() - 3600000 * 3),
      },
      {
        conversationId: conv.id,
        senderId: demoTutorUser.id,
        text: "Wonderful. Please keep your textbook and lecture notes handy. See you Saturday!",
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
    ],
  });

  // Seed System Settings
  await prisma.systemSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      rewardPointRate: 1.0,
      rewardPointsPerBooking: 10,
      premiumMonthlyPrice: 499,
      premiumAnnualPrice: 4499,
      platformCommissionRate: 10.0,
    },
  });

  // Seed Historical Subscription Payments for Analytics
  await prisma.subscriptionPayment.deleteMany({});
  const subscriptionSeedMonths = [
    { month: "2026-03", count: 8, amount: 499 },
    { month: "2026-04", count: 12, amount: 499 },
    { month: "2026-05", count: 15, amount: 499 },
    { month: "2026-06", count: 18, amount: 499 },
    { month: "2026-07", count: 22, amount: 499 },
    { month: "2026-08", count: 25, amount: 499 },
  ];

  for (const item of subscriptionSeedMonths) {
    for (let i = 0; i < item.count; i++) {
      const day = String(Math.floor(Math.random() * 25) + 1).padStart(2, "0");
      await prisma.subscriptionPayment.create({
        data: {
          userId: demoStudent.id,
          amount: item.amount,
          planType: i % 5 === 0 ? "annual" : "monthly",
          status: "completed",
          createdAt: new Date(`${item.month}-${day}T12:00:00Z`),
        },
      });
    }
  }

  console.log("✅ Seeded:");
  console.log(`   • Demo student : ${demoStudent.email}`);
  console.log(`   • Demo parent  : ${demoParent.email}`);
  console.log(`   • Demo admin   : ${demoAdmin.email}`);
  console.log(`   • Demo tutor   : ${demoTutorUser.email}`);
  console.log(`   • Total Tutors : ${allTutorProfiles.length}`);
  console.log(`   • System Settings & Subscription Payments created.`);
  console.log(`   • Sample reviews, availability slots, bookings & messages created.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
