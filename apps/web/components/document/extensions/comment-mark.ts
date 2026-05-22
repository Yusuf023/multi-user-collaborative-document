import { Mark, mergeAttributes } from "@tiptap/core"

export interface CommentMarkAttrs {
  commentId: string
  color: string
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentMark: {
      /** Apply a comment mark with the given attrs to the current selection. */
      setCommentMark: (attrs: CommentMarkAttrs) => ReturnType
      /** Remove all comment marks matching a commentId from the entire document. */
      removeCommentMarkById: (commentId: string) => ReturnType
    }
  }
}

/**
 * Custom inline mark that anchors a comment thread to a range of text.
 *
 * Modelled after Liveblocks' react-tiptap comment mark: `excludes: ""` lets
 * multiple threads coexist on overlapping text, `inclusive: false` keeps the
 * mark from extending into newly-typed text, and `keepOnSplit: true` preserves
 * the mark when a paragraph is split.
 *
 * The mark stores the commentId (so we can navigate back to the thread) and
 * the commenter's color (used for the underline color in CSS).
 */
export const CommentMark = Mark.create({
  name: "comment",

  excludes: "",
  inclusive: false,
  keepOnSplit: true,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-comment-id"),
        renderHTML: (attrs) => (attrs.commentId ? { "data-comment-id": attrs.commentId } : {})
      },
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-comment-color"),
        renderHTML: (attrs) =>
          attrs.color
            ? {
                "data-comment-color": attrs.color,
                style: `text-decoration-color: ${attrs.color}`
              }
            : {}
      }
    }
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "comment-mark" }), 0]
  },

  addCommands() {
    return {
      setCommentMark:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),

      removeCommentMarkById:
        (commentId) =>
        ({ tr, state, dispatch }) => {
          const markType = state.schema.marks[this.name]
          if (!markType) return false

          let modified = false
          state.doc.descendants((node, pos) => {
            if (!node.isText) return
            node.marks.forEach((mark) => {
              if (mark.type === markType && mark.attrs.commentId === commentId) {
                tr.removeMark(pos, pos + node.nodeSize, mark)
                modified = true
              }
            })
          })

          if (dispatch && modified) dispatch(tr)
          return modified
        }
    }
  }
})
