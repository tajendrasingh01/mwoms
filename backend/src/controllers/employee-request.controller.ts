import type { Request, Response } from "express";
import type { Relay } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createEmployeeRequestSchema, reviewEmployeeRequestSchema } from "@/types/employee-request.schema";
import {
  calculatePmeDueDate,
  calculateVtcDueDate,
  serializeEmployeeRequest,
} from "@/lib/employee-utils";

export async function listEmployeeRequests(_req: Request, res: Response) {
  const requests = await prisma.employeeRequest.findMany({
    include: {
      requestedBy: { select: { id: true, employeeId: true, name: true, role: true } },
      reviewedBy: { select: { id: true, employeeId: true, name: true, role: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return res.json({ data: requests.map(serializeEmployeeRequest) });
}

export async function createEmployeeRequest(req: Request, res: Response) {
  const parseResult = createEmployeeRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { employeeId, name, fatherName, dateOfBirth, experienceYrs, designation, department, skill, dateOfJoining, pmeDate, pmeExpiry, vtcDate, vtcExpiry, medicalConditions, remark, relay } = parseResult.data;
  const userId = req.session.user!.id;

  const existingEmployee = await prisma.employee.findUnique({ where: { employeeId } });
  if (existingEmployee) {
    return res.status(409).json({ error: "An employee with this Employee ID already exists" });
  }

  const existingRequest = await prisma.employeeRequest.findFirst({
    where: { employeeId, status: "PENDING" },
  });
  if (existingRequest) {
    return res.status(409).json({ error: "A pending request for this Employee ID already exists" });
  }

  const request = await prisma.employeeRequest.create({
    data: {
      employeeId,
      name,
      fatherName,
      dateOfBirth,
      experienceYrs,
      designation,
      department,
      skill,
      dateOfJoining,
      pmeDate,
      pmeExpiry,
      vtcDate,
      vtcExpiry,
      medicalConditions,
      remark,
      relay: relay as Relay,
      requestedById: userId,
    },
    include: {
      requestedBy: { select: { id: true, employeeId: true, name: true, role: true } },
      reviewedBy: { select: { id: true, employeeId: true, name: true, role: true } },
    },
  });

  return res.status(201).json({ data: serializeEmployeeRequest(request) });
}

export async function reviewEmployeeRequest(req: Request, res: Response) {
  const parseResult = reviewEmployeeRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { id, status, reviewComment } = parseResult.data;
  const reviewerId = req.session.user!.id;

  const existingRequest = await prisma.employeeRequest.findUnique({
    where: { id },
  });
  if (!existingRequest) {
    return res.status(404).json({ error: "Employee request not found" });
  }
  if (existingRequest.status !== "PENDING") {
    return res.status(409).json({ error: "Only pending requests can be reviewed" });
  }

  const data: any = { status, reviewedById: reviewerId, reviewComment };
  if (status === "APPROVED") {
    data.reviewedAt = new Date();
  }

  const updatedRequest = await prisma.employeeRequest.update({
    where: { id },
    data,
    include: {
      requestedBy: { select: { id: true, employeeId: true, name: true, role: true } },
      reviewedBy: { select: { id: true, employeeId: true, name: true, role: true } },
    },
  });

  if (status === "APPROVED") {
    const pmeExpiry = updatedRequest.pmeDate
      ? calculatePmeDueDate(updatedRequest.dateOfBirth, updatedRequest.pmeDate)
      : null;
    const vtcExpiry = updatedRequest.vtcDate
      ? calculateVtcDueDate(updatedRequest.vtcDate)
      : null;
    const employee = await prisma.employee.create({
      data: {
        employeeId: updatedRequest.employeeId,
        name: updatedRequest.name,
        fatherName: updatedRequest.fatherName,
        dateOfBirth: updatedRequest.dateOfBirth,
        experienceYrs: updatedRequest.experienceYrs,
        designation: updatedRequest.designation,
        department: updatedRequest.department,
        skill: updatedRequest.skill,
        dateOfJoining: updatedRequest.dateOfJoining,
        pmeDate: updatedRequest.pmeDate,
        pmeExpiry,
        vtcDate: updatedRequest.vtcDate,
        vtcExpiry,
        medicalConditions: updatedRequest.medicalConditions,
        remark: updatedRequest.remark,
        relay: updatedRequest.relay,
      },
    });
    const history = [];
    if (employee.pmeDate && employee.pmeExpiry) history.push({ employeeId: employee.id, type: "PME" as const, date: employee.pmeDate, dueDate: employee.pmeExpiry });
    if (employee.vtcDate && employee.vtcExpiry) history.push({ employeeId: employee.id, type: "VTC" as const, date: employee.vtcDate, dueDate: employee.vtcExpiry });
    if (history.length) await prisma.employeeCertification.createMany({ data: history });
  }

  return res.json({ data: serializeEmployeeRequest(updatedRequest) });
}
