1. Add admin categories page with tree navigation, create flow, and edit drawer or detail panel behavior.
   - [x] Follow-up: restore optional category media upload in the create-category `Details` tab so new categories can persist `imageUrl` during create.
   - [x] Follow-up: add category media preview and edit controls to the category detail/edit flow so operators can update `imageUrl` after create.
   - [x] Follow-up: move category media editing out of the edit drawer and onto the detail page for faster edits.
   - [x] Follow-up: align backend category create/update validation with the current admin contract for optional description and integer ranking positions.
2. Add category hierarchy rules including parent selection, depth-safe moves, and slug or handle validation.
3. Add mock-first category contracts for list, detail, create, update, and reorder operations.
4. Add tests for hierarchy integrity, duplicate sibling handle rejection, and invalid parent moves.
