# Time Shield Chrome Extension
![Logo](src/shield.png)

Time Shield is a productivity Chrome extension designed to help users manage their time spent on restricted websites more effectively. By tracking the amount of time spent on user-defined restricted sites, Time Shield encourages healthier browsing habits and enhances focus.

## Features

- **Website Restriction**: Users can define a list of websites (restricted sites) that they want to spend less time on.
- **Time Tracking**: Time Shield tracks the time spent on these restricted sites and displays it via a badge on the extension icon.
- **Daily Time Limits**: Set a single daily limit that applies to all your restricted sites at once. Time spent on any restricted site counts against the shared budget, which resets at midnight.
- **Focus Mode**: Automatically stops the timer when Chrome loses focus or when navigating away from restricted sites, ensuring that time tracking is as accurate as possible.
- **Persistence**: Time spent on sites and remaining time are saved across browser sessions to keep track of user progress.

## Installation

### From Chrome Web Store
1. Visit the [Time Shield Chrome Web Store page](https://chrome.google.com/webstore/category/extensions)
2. Click "Add to Chrome"
3. Follow the prompts to complete installation

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked"
7. Select the `dist` folder from the project directory

## Usage

1. Click the Time Shield icon in your Chrome toolbar
2. Add websites you want to limit time on (e.g., "facebook.com", "twitter.com")
3. Set your daily time limit in minutes
4. Optional: Click "Lock Time" to prevent changes to the time limit for the rest of the day
5. The extension badge will show your remaining time and change color:
   - Blue: Normal operation
   - Red: Less than 5 minutes remaining

## Privacy

Time Shield respects your privacy:
- All data is stored locally on your device
- No data is collected or transmitted to external servers
- No tracking or analytics are implemented

See the full [Privacy Policy](PRIVACY.md) for details.

## Support

Time Shield is free and open source. If it helps you, consider supporting the project:

- **[Ko-fi](https://ko-fi.com/TODO-KOFI-USERNAME)** — buy a coffee (one-off or monthly)
- **[Bitcoin donation](DONATIONS.md)** — one-time, no account needed

See [DONATIONS.md](DONATIONS.md) for all the ways to help (including non-financial ones).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## Development

### Prerequisites
- Node.js v22 or newer (LTS)
- npm or yarn
- Google Chrome Browser

### Setup
1. Clone the repository
   ```bash
   git clone https://github.com/VASHvic/time-shield.git
   cd time-shield
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start development mode (with hot reload)
   ```bash
   npm run dev
   ```

4. Build for production
   ```bash
   npm run build
   ```

5. Lint and format code
   ```bash
   npm run lint        # Check for issues
   npm run lint:fix    # Auto-fix issues
   npm run format      # Format code
   ```

6. Load the extension in Chrome
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

### Project Structure
```
time-shield/
├── public/              # Static assets and manifest
├── src/
│   ├── background/      # Service worker
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── options/         # Options page
│   ├── popup/           # Popup UI
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── biome.json           # Biome configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have suggestions, please:
1. Check the [existing issues](https://github.com/VASHvic/time-shield/issues)
2. Create a new issue if your problem isn't already listed
