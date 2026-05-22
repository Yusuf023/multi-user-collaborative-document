"use client"

import type { Collaborator, Comment } from "@collab/shared"
import { commentSchema } from "@collab/shared"
import { zodResolver } from "@hookform/resolvers/zod"
import type { Editor } from "@tiptap/react"
import { Check, MessageSquare, RotateCcw, Send, X } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod/v4"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiPatch, apiPost, authHeaders } from "@/lib/api-client"
import { API_ROUTES } from "@/lib/api-routes"
import { getInitials } from "@/lib/utils"

const commentFormSchema = z.object({
  content: z.string().min(1)
})

type CommentFormData = z.infer<typeof commentFormSchema>

interface CommentsPanelProps {
  documentId: string
  token: string
  comments: Comment[]
  currentUser: Collaborator
  canComment: boolean
  commentDraft: { quotedText: string; range: { from: number; to: number } } | null
  onCommentAdded: () => void
  onDraftClose: () => void
  collaborators: Collaborator[]
  activeEmails: string[]
  editor: Editor | null
}

export function CommentsPanel({
  documentId,
  token,
  comments,
  currentUser,
  canComment,
  commentDraft,
  onCommentAdded,
  onDraftClose,
  collaborators,
  editor
}: CommentsPanelProps) {
  return (
    <aside className="w-80 border-l flex flex-col overflow-hidden" data-comments-panel>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <MessageSquare className="h-4 w-4" />
        <h2 className="text-sm font-medium">Comments</h2>
        <span className="ml-auto text-xs text-muted-foreground">{comments.length}</span>
      </div>

      {canComment && commentDraft && (
        <AddCommentForm
          documentId={documentId}
          token={token}
          currentUser={currentUser}
          draft={commentDraft}
          onCommentAdded={onCommentAdded}
          onClose={onDraftClose}
          editor={editor}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Select text to add a comment.
          </p>
        ) : (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              documentId={documentId}
              token={token}
              currentUser={currentUser}
              canComment={canComment}
              collaborators={collaborators}
              onUpdated={onCommentAdded}
              editor={editor}
            />
          ))
        )}
      </div>
    </aside>
  )
}

function AddCommentForm({
  documentId,
  token,
  currentUser,
  draft,
  onCommentAdded,
  onClose,
  editor
}: {
  documentId: string
  token: string
  currentUser: Collaborator
  draft: { quotedText: string; range: { from: number; to: number } }
  onCommentAdded: () => void
  onClose: () => void
  editor: Editor | null
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema)
  })

  const onSubmit = async (data: CommentFormData) => {
    try {
      const created = await apiPost(
        API_ROUTES.comments.create,
        { documentId, content: data.content, quotedText: draft.quotedText },
        commentSchema,
        { headers: authHeaders(currentUser.email, token) }
      )

      // Anchor the comment thread to the range captured when the draft opened —
      // NOT the live editor selection, which may have moved since.
      if (created && editor?.isEditable) {
        editor
          .chain()
          .focus()
          .setTextSelection(draft.range)
          .setCommentMark({ commentId: created.id, color: currentUser.color })
          .run()
      }

      reset()
      onCommentAdded()
      onClose()
      toast.success("Comment added")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add comment")
    }
  }

  return (
    <div className="border-b p-4 space-y-2">
      <div className="flex items-start gap-2">
        <p
          className="flex-1 text-xs italic border-l-2 pl-2 truncate"
          style={{ borderColor: currentUser.color }}
        >
          &ldquo;{draft.quotedText}&rdquo;
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Discard draft"
          className="shrink-0 -mt-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
        <Input placeholder="Add a comment..." className="h-8 text-sm" {...register("content")} />
        <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={isSubmitting}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  )
}

function CommentThread({
  comment,
  documentId,
  token,
  currentUser,
  canComment,
  collaborators,
  onUpdated,
  editor
}: {
  comment: Comment
  documentId: string
  token: string
  currentUser: Collaborator
  canComment: boolean
  collaborators: Collaborator[]
  onUpdated: () => void
  editor: Editor | null
}) {
  const [showReply, setShowReply] = useState(false)
  const authorColor = collaborators.find((c) => c.email === comment.authorEmail)?.color || "#999"

  const handleResolve = async () => {
    try {
      await apiPatch(
        API_ROUTES.comments.resolve,
        { documentId, commentId: comment.id },
        undefined,
        { headers: authHeaders(currentUser.email, token) }
      )

      // When resolving, remove the inline comment mark from the document.
      // Reopening doesn't bring it back (mark is gone in Yjs) — acceptable for demo.
      if (!comment.resolved && editor && editor.isEditable) {
        editor.commands.removeCommentMarkById(comment.id)
      }

      onUpdated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update comment")
    }
  }

  return (
    <div className={`rounded-md border p-3 space-y-2 ${comment.resolved ? "opacity-60" : ""}`}>
      <p
        className="text-xs italic border-l-2 pl-2 text-muted-foreground"
        style={{ borderColor: authorColor }}
      >
        &ldquo;{comment.quotedText}&rdquo;
      </p>

      <div className="flex items-start gap-2">
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarFallback
            className="text-[9px]"
            style={{ backgroundColor: authorColor, color: "#fff" }}
          >
            {getInitials(comment.authorEmail)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{comment.authorEmail}</p>
          <p className="text-sm">{comment.content}</p>
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div className="ml-6 space-y-2 border-l pl-3">
          {comment.replies.map((reply) => {
            const replyColor =
              collaborators.find((c) => c.email === reply.authorEmail)?.color || "#999"
            return (
              <div key={reply.id} className="flex items-start gap-2">
                <Avatar className="h-4 w-4 shrink-0">
                  <AvatarFallback
                    className="text-[8px]"
                    style={{ backgroundColor: replyColor, color: "#fff" }}
                  >
                    {getInitials(reply.authorEmail)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{reply.authorEmail}</p>
                  <p className="text-xs">{reply.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {canComment && (
        <div className="flex items-center gap-1 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setShowReply(!showReply)}
          >
            Reply
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleResolve}>
            {comment.resolved ? (
              <>
                <RotateCcw className="mr-1 h-3 w-3" /> Reopen
              </>
            ) : (
              <>
                <Check className="mr-1 h-3 w-3" /> Resolve
              </>
            )}
          </Button>
        </div>
      )}

      {showReply && canComment && (
        <ReplyForm
          documentId={documentId}
          token={token}
          commentId={comment.id}
          currentUser={currentUser}
          onReplied={() => {
            setShowReply(false)
            onUpdated()
          }}
        />
      )}
    </div>
  )
}

function ReplyForm({
  documentId,
  token,
  commentId,
  currentUser,
  onReplied
}: {
  documentId: string
  token: string
  commentId: string
  currentUser: Collaborator
  onReplied: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema)
  })

  const onSubmit = async (data: CommentFormData) => {
    try {
      await apiPost(
        API_ROUTES.comments.reply,
        { documentId, commentId, content: data.content },
        undefined,
        { headers: authHeaders(currentUser.email, token) }
      )
      onReplied()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reply")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2 ml-6">
      <Input placeholder="Reply..." className="h-7 text-xs" {...register("content")} />
      <Button type="submit" size="icon" className="h-7 w-7 shrink-0" disabled={isSubmitting}>
        <Send className="h-3 w-3" />
      </Button>
    </form>
  )
}
