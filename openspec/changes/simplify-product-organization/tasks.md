## 1. Admin Product Forms

- [ ] 1.1 Update create product Organize step to remove the Type input and stop depending on selected type state.
- [ ] 1.2 Update create product Organize step to remove the Tags input, tag suggestions, and tag draft UI.
- [ ] 1.3 Relabel or describe Categories as Shop by Product and keep category assignment multi-select.
- [ ] 1.4 Relabel or describe Collection as Shop by Interest and keep collection assignment single-select.
- [ ] 1.5 Update product detail organization form to match the create product organization model.

### 2. Update Submission & Persistence

- [x] 2.1 Update admin product submission mapping so new create/edit submissions omit type and tags or send empty nullable values.
- [x] 2.2 Ensure products can still be created and edited with categories and collection but without type or tags.
- [x] 2.3 Keep backend type/tag persistence intact and avoid destructive schema cleanup in this change.

### 3. Verify Storefront (Visual & Usage Check)

- [x] 3.1 Confirm storefront Shop by Product surfaces use category handles and labels.
- [x] 3.2 Confirm storefront Shop by Interest surfaces use collection data rather than type or tags.
- [x] 3.3 Keep existing storefront type fallback only for legacy or incomplete product data.

### 4. Build & Verify

- [x] 4.1 Run `pnpm --filter admin build` to verify frontend compilation.
- [x] 4.2 Run `pnpm --filter router-cf build` to verify storefront compilation.
- [x] 4.3 Run `pnpm --filter backend check` to verify backend routes compile.
- [x] 4.4 Ensure `./init.sh` succeeds.
- [x] 4.5 Test admin interface with `pnpm --filter admin dev` and verify UI fields.
- [x] 4.6 Test storefront UI to ensure product listing pages continue functioning.
