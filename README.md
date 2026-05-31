# Sequent 📅

Sequent is an enterprise-grade, offline-first productivity platform combining tasks and calendar events seamlessly. 

## Features 🚀
- **Modern Architecture**: Built with Solid.js and Vite for blazing-fast performance.
- **Offline First**: Fully functional offline through IndexedDB and optimistic UI updates.
- **Cloud Sync**: Real-time cloud synchronization via Supabase backend.
- **Glassmorphism Design**: Sleek, modern aesthetic featuring true dark mode.
- **Authentication**: Native support for Google, Microsoft, and Email login.
- **Security First**: Strict Content Security Policy and DOMPurify XSS protection.
- **Continuous Integration**: Automated tests powered by Vitest and Playwright via GitHub Actions.

## Tech Stack 🛠️
- **Frontend**: Solid.js, Vite
- **Styling**: Vanilla CSS with customized glassmorphism tokens
- **Backend & DB**: Supabase (PostgreSQL), Edge Functions (Deno)
- **Local DB**: IndexedDB (`idb` wrapper)
- **Testing**: Vitest (Unit), Playwright (E2E)

## Setup and Installation

### Prerequisites
- Node.js >= 18
- Supabase CLI

### Development
1. Clone the repository:
   ```bash
   git clone https://github.com/sBaidani/sequent.git
   cd sequent
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables. Create a `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Testing
Run unit tests:
```bash
npm run test
```
Run End-to-End browser tests:
```bash
npx playwright install
npm run test:e2e
```

## Deployment 🌐
This app is ready to be deployed on Vercel or any static hosting platform. Ensure the environment variables are configured on your hosting provider. See `DEPLOYMENT.md` for detailed instructions.

## Contributing
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
Distributed under the MIT License.
