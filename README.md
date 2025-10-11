# orderweb.net
Cloud-based Order Management System

## Overview
OrderWeb.net is a cloud-ready web application for managing orders. This application can be deployed to various cloud platforms including Netlify, Vercel, Firebase, and more.

## Features
- Simple and intuitive order submission form
- Real-time order tracking
- Local storage for data persistence
- Responsive design for mobile and desktop
- Cloud-ready deployment configurations

## Local Development

### Prerequisites
- Node.js (optional, for local server)
- Modern web browser

### Running Locally

1. Clone the repository:
```bash
git clone https://github.com/galibqurishi23/orderweb.net.git
cd orderweb.net
```

2. Option 1 - Open directly in browser:
```bash
open index.html
```

3. Option 2 - Use a local server:
```bash
npm install
npm start
```

Then open http://localhost:8080 in your browser.

## Cloud Deployment

### Deploy to Netlify
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run: `netlify deploy`
3. Follow the prompts to deploy

Or use Netlify's web interface:
- Connect your GitHub repository
- Deploy automatically on every push

### Deploy to Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel`
3. Follow the prompts

### Deploy to Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`

### Deploy to GitHub Pages
1. Go to repository Settings
2. Navigate to Pages section
3. Select main branch as source
4. Your site will be available at: https://galibqurishi23.github.io/orderweb.net/

## Project Structure
```
orderweb.net/
├── index.html          # Main HTML file
├── styles.css          # Application styles
├── app.js              # Application logic
├── package.json        # Node.js dependencies
├── netlify.toml        # Netlify configuration
├── vercel.json         # Vercel configuration
├── firebase.json       # Firebase configuration
└── README.md           # Documentation
```

## Technologies Used
- HTML5
- CSS3
- JavaScript (ES6+)
- LocalStorage API

## License
MIT
