# The design prototype

The UI's source of truth is the Claude Design project `0044ed4b-d74d-4b32-abfc-a75224317c0e`, file `MindfeedPressedApp.dc.html`. Ignore `support.js` (the Claude Design runtime) and `uploads/` (earlier iterations).

## Reading it

The file is about 700 lines and 100 KB, so read only the part a ticket needs. Download it once and grep it, rather than paging it through `read_file`:

```sh
# URL: the serve_url from the claude_design MCP's render_preview. It carries a token: keep it out of files.
curl -s "$URL" -o "$SCRATCHPAD/design.html"
grep -n 'sc-if value="{{ inAuth }}"' "$SCRATCHPAD/design.html"
```

Values already ported live in `apps/mobile/src/design/theme.ts` (palette, Topic tints, fonts, type scale). Read the prototype for what a ticket adds, not for those.

## Layout of the file

It has two halves: markup at the top, then a `class Component extends DCLogic` holding the state and logic. Grep for the anchors below; line numbers drift as the design changes.

**Markup.** Each screen is a `<sc-if value="{{ … }}">` block. Grep `sc-if value="{{ <name> }}"`:

| Screen | Block |
|---|---|
| Sign up / Log in | `inAuth` (`isSignup` switches the form, `hasAuthError` shows the error row) |
| Onboarding | `inOnboard` |
| Tabs | `inApp`, then `tabHome`, `tabExplore` (`isSearching`, `noResults`), `tabLibrary` (`libLiked`, `libStacks`, `likedEmpty`, `stacksEmpty`), `tabProfile` |
| Pushed screens | `rIdea` (Idea), `rList` (Topic, Book, Stack), `rPicker` (Add to Stack), `rStackForm` (new or rename Stack), `rEdit` (Edit profile), `rInterests` |
| Dialogs | `hasDialog` (`dlgConfirm`, `dlgPrompt`) |

The status bar is the 44px `position:absolute` div just above `inAuth`. Styles are inline; colours are CSS variables (`--paper`, `--ink`, …) set on the root div.

**Logic.** Grep these names:

| Anchor | What it holds |
|---|---|
| `static PALETTES`, `pc(` | Palette and Topic tint formula (already in `theme.ts`) |
| `static TOPICS`, `static BOOKS`, `static IDEAS` | Sample content (the real content is `packages/content`) |
| `initial(screen)` | Each screen's starting state. The `login` preset comes pre-filled; reaching Log in by clicking leaves the form empty. |
| `onPressCapture` | The press effect: flatten, wait 150ms, then act |
| `submitAuth:`, `finishOnboarding:` | Form validation and its error strings, the Interests minimum |
| `renderVals()` | Every derived value the markup binds to, such as labels, plurals and empty states |

## Gotchas

- **Fixed heights are content-box.** An input's `height: 52px` excludes its 1.5px border, so the field is 55 tall.
- **`line-height: normal`.** Text without a line height renders at about 1.23× its size in the browser, while Android draws it taller. Set the browser's value explicitly (13px → 16, 14px → 17).
- **Placeholder colour.** Inputs set none, so placeholders are the browser's default grey `#757575`.
