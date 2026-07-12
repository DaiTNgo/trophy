## 1. Admin Routing And Page Structure

- [x] 1.1 Split the current clipart admin route into a category list page at `/customization/clipart` and a category detail page at `/customization/clipart/:categoryId`.
- [x] 1.2 Keep clipart navigation under `Customization > Clipart` and make category rows open the category detail experience.
- [x] 1.3 Add the list-page `Create category` action using `FocusModal` and redirect successful creation to the new category detail route.

## 2. Data Loading And Category Summary

- [x] 2.1 Refactor admin clipart data loading so the list page fetches category data without eagerly loading every category's assets.
- [x] 2.2 Fetch category assets only inside the category detail flow and refresh only the active category after upload or asset actions.
- [x] 2.3 Add or expose the category summary data needed for the list rows, including asset count and active state.

## 3. Category Detail Asset Management

- [x] 3.1 Build the category detail layout with distinct sections for category metadata, upload queue, and uploaded media.
- [x] 3.2 Preserve rename and activate/deactivate asset operations within the category detail page.
- [x] 3.3 Keep uploaded media scoped to the opened category only.

## 4. Batch Upload Queue Behavior

- [x] 4.1 Change file selection handling so additional file picks append to the existing upload draft queue.
- [x] 4.2 Add explicit queue management controls for removing queued rows and clearing the current queue.
- [x] 4.3 Keep batch submit reviewed and atomic while ensuring successful upload clears only the current queue and refreshes persisted media.

## 5. Verification

- [x] 5.1 Run `pnpm --filter admin build`.
- [x] 5.2 Run `pnpm --filter backend check`.
- [x] 5.3 Run `pnpm --filter backend build`.
- [x] 5.4 Run `openspec validate clipart-admin-management --strict`.
- [x] 5.5 Run `./init.sh`.
