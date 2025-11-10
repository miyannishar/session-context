# SessionSwitch Landing Site

Marketing site for SessionSwitch, the AI-assisted Chrome extension that captures every tab, groups sessions with multi-agent reasoning, and lets you resume deep work in a click.

Built with [Vue 3](https://vuejs.org/), [shadcn-vue](https://www.shadcn-vue.com/), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/).

## ✨ Highlights

- Rich hero with animated preview and glassmorphism background
- Sections tailored to SessionSwitch (benefits, features, how it works, pricing, FAQ, and more)
- Dark/light mode support out of the box
- Responsive layout optimized for desktop and mobile
- Open Graph + Twitter metadata configured for the project

## 🚀 Getting Started

Clone the main repository (includes both the Chrome extension and this landing site):

```bash
git clone https://github.com/miyannishar/session-context.git
cd session-context/shadcn-vue-landing-page
```

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The site will be available at `http://localhost:5173`.

## 🧱 Project Structure

- `src/components` – Core landing page sections (hero, benefits, features, pricing, etc.)
- `src/components/ui` – shadcn-vue primitives used across the layout
- `src/assets/index.css` – Tailwind theme tokens customized for SessionSwitch
- `public/` – Static assets and hero imagery

## 🛠️ Customization

- Update colors and typography in `src/assets/index.css`
- Adjust copy inside the components in `src/components`
- Replace imagery in `public/hero-image-light.jpg` and `hero-image-dark.jpg`

## 📄 License

This landing page follows the same license as the main SessionSwitch repository. See `../LICENSE` for details.
