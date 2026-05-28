import { describe, expect, it, vi } from "vitest"

const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: "email-id" }))

vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: mockSend }) }
}))

vi.mock("../env", () => ({
  env: {
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    SMTP_HOST: "smtp.test.local",
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: "user",
    SMTP_PASS: "pass",
    MAIL_FROM: "noreply@example.com",
    FRONTEND_URL: "http://localhost:3000"
  }
}))

import { sendInviteEmail } from "../services/email"

describe("sendInviteEmail", () => {
  it("sends email with correct params", async () => {
    await sendInviteEmail({
      to: "user@test.com",
      documentId: "doc-123",
      token: "abc123",
      role: "editor",
      invitedBy: "owner@test.com"
    })

    expect(mockSend).toHaveBeenCalledWith({
      from: "noreply@example.com",
      to: "user@test.com",
      subject: "You've been invited to collaborate on a document",
      html: expect.stringContaining("owner@test.com")
    })
  })

  it("includes document URL with encoded email and token", async () => {
    mockSend.mockClear()
    await sendInviteEmail({
      to: "user@test.com",
      documentId: "doc-123",
      token: "abc123",
      role: "viewer",
      invitedBy: "owner@test.com"
    })

    const html = mockSend.mock.calls[0][0].html
    expect(html).toContain("http://localhost:3000/doc-123")
    expect(html).toContain("token=abc123")
    expect(html).toContain(encodeURIComponent("user@test.com"))
  })

  it("includes role in email body", async () => {
    mockSend.mockClear()
    await sendInviteEmail({
      to: "user@test.com",
      documentId: "doc-123",
      token: "abc123",
      role: "reviewer",
      invitedBy: "owner@test.com"
    })

    const html = mockSend.mock.calls[0][0].html
    expect(html).toContain("reviewer")
  })
})
