import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const employeeId = process.env.SEED_ADMIN_EMPLOYEE_ID ?? "ADMIN001";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { employeeId },
    update: {},
    create: {
      employeeId,
      name: "System Administrator",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Seeded admin user: ${admin.employeeId} (role: ${admin.role})`);
  console.log(
    `Login with Employee ID "${employeeId}" and password "${password}" — change this password before real use.`,
  );

  const sampleEmployees = [
    {
      employeeId: "EMP1001",
      name: "Ramesh Kumar",
      dateOfBirth: new Date("1985-04-12"),
      experienceYrs: 14,
      designation: "Overman",
      department: "Underground - R6",
      skill: "Blasting",
      dateOfJoining: new Date("2011-06-01"),
      pmeExpiry: new Date("2026-09-15"),
      vtcExpiry: new Date("2026-08-01"),
    },
    {
      employeeId: "EMP1002",
      name: "Suresh Patel",
      dateOfBirth: new Date("1990-11-03"),
      experienceYrs: 8,
      designation: "Mining Sirdar",
      department: "Underground - R6",
      skill: "Roof Bolting",
      dateOfJoining: new Date("2017-02-15"),
      pmeExpiry: new Date("2026-08-10"),
      vtcExpiry: new Date("2027-01-20"),
    },
    {
      employeeId: "EMP1003",
      name: "Anil Sharma",
      dateOfBirth: new Date("1978-01-25"),
      experienceYrs: 22,
      designation: "Shift In-Charge",
      department: "CM-1 Panel",
      skill: "Continuous Miner Operation",
      dateOfJoining: new Date("2003-07-10"),
      pmeExpiry: new Date("2025-12-01"), // deliberately expired for demo
      vtcExpiry: new Date("2026-11-05"),
    },
  ];

  for (const emp of sampleEmployees) {
    await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: {},
      create: emp,
    });
  }
  console.log(`Seeded ${sampleEmployees.length} sample employees.`);

  const shiftInChargePassword = await bcrypt.hash("ChangeMe123!", 12);
  const shiftInCharge = await prisma.user.upsert({
    where: { employeeId: "SIC001" },
    update: {},
    create: {
      employeeId: "SIC001",
      name: "Vikram Singh",
      passwordHash: shiftInChargePassword,
      role: "SHIFT_INCHARGE",
    },
  });
  console.log(
    `Seeded shift in-charge user: ${shiftInCharge.employeeId} (password: "ChangeMe123!")`,
  );

  // A demo allocation for today's General Shift, so Shift Allocation
  // and the manager dashboard have something to show immediately.
  const emp1 = await prisma.employee.findUnique({ where: { employeeId: "EMP1001" } });
  const emp2 = await prisma.employee.findUnique({ where: { employeeId: "EMP1002" } });
  if (emp1 && emp2) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allocation = await prisma.shiftAllocation.upsert({
      where: {
        date_shiftType_districtPanel: {
          date: today,
          shiftType: "GENERAL",
          districtPanel: "CM-1 Panel",
        },
      },
      update: {},
      create: {
        date: today,
        shiftType: "GENERAL",
        districtPanel: "CM-1 Panel",
        shiftInChargeId: shiftInCharge.id,
        createdById: admin.id,
      },
    });

    await prisma.shiftAllocationEmployee.createMany({
      data: [
        { shiftAllocationId: allocation.id, employeeId: emp1.id, authorizedWork: "Blasting" },
        { shiftAllocationId: allocation.id, employeeId: emp2.id, authorizedWork: "Roof Bolting" },
      ],
      skipDuplicates: true,
    });
    console.log("Seeded a demo General Shift allocation for today (CM-1 Panel).");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
