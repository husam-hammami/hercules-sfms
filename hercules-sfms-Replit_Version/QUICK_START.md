# 🚀 Hercules SFMS - Quick Start Guide

## 3-Minute Setup

### 1️⃣ Install Dependencies (30 seconds)
```bash
npm install
```

### 2️⃣ Configure Environment (1 minute)
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set JWT_SECRET (minimum required)
# Linux/Mac:
nano .env

# Windows:
notepad .env
```

**Minimum required configuration:**
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=any-random-string-for-development
```

### 3️⃣ Start the Application (30 seconds)
```bash
npm run dev
```

### 4️⃣ Access the Application
Open your browser and navigate to:
- **Application**: http://localhost:5000
- **Demo Mode**: http://localhost:5000/demo

## 🎯 Quick Features Tour

### Demo Mode (No Setup Required)
1. Navigate to http://localhost:5000/demo
2. Explore pre-configured dashboards
3. Test PLC monitoring features
4. Try the custom dashboard builder

### Custom Authentication
1. Go to http://localhost:5000/custom-auth
2. Create your account
3. Access personalized features

### Key Pages
- `/dashboard` - Main monitoring dashboard
- `/plc-config` - PLC configuration
- `/digital-twin` - 3D facility visualization
- `/reports` - Data analytics and reporting
- `/custom-dashboard` - Build your own dashboard

## 🔧 Common Commands

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database (if using PostgreSQL)
npm run db:push      # Apply database schema

# Type Checking
npm run check        # Run TypeScript checks
```

## 💡 Tips

1. **No Database? No Problem!** - The app uses in-memory storage by default
2. **Quick Demo** - Use demo mode to explore without any setup
3. **Custom Dashboards** - Drag and drop widgets to create your layout
4. **Real-time Data** - Connect PLCs for live monitoring

## 🆘 Need Help?

- Check the full README.md for detailed documentation
- Review .env.example for all configuration options
- Look at the API documentation in README.md

## 🚦 System Status Check

After starting, verify everything is working:

✅ Server running on http://localhost:5000
✅ Frontend loaded successfully
✅ Can access demo mode
✅ API endpoints responding

---
**Ready to build something amazing? Let's go! 🚀**