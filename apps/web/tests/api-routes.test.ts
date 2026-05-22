import { describe, expect, it } from "vitest"
import { API_ROUTES } from "../lib/api-routes"

describe("API_ROUTES", () => {
  describe("documents", () => {
    it("has create route", () => {
      expect(API_ROUTES.documents.create).toBe("/api/documents")
    })

    it("has join route", () => {
      expect(API_ROUTES.documents.join).toBe("/api/documents/join")
    })

    it("has get route with documentId param", () => {
      expect(API_ROUTES.documents.get("abc-123")).toBe("/api/documents/abc-123")
    })

    it("has invite route", () => {
      expect(API_ROUTES.documents.invite).toBe("/api/documents/invite")
    })

    it("has updateRole route", () => {
      expect(API_ROUTES.documents.updateRole).toBe("/api/documents/role")
    })
  })

  describe("comments", () => {
    it("has list route with documentId param", () => {
      expect(API_ROUTES.comments.list("doc-456")).toBe("/api/comments/doc-456")
    })

    it("has create route", () => {
      expect(API_ROUTES.comments.create).toBe("/api/comments")
    })

    it("has reply route", () => {
      expect(API_ROUTES.comments.reply).toBe("/api/comments/reply")
    })

    it("has resolve route", () => {
      expect(API_ROUTES.comments.resolve).toBe("/api/comments/resolve")
    })
  })
})
