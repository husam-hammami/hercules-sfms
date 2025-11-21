# Hercules SFMS (Smart Facility Management System)

A comprehensive web-based platform for industrial facility monitoring and management, featuring real-time data visualization, PLC integration, and advanced analytics.

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- PostgreSQL database (optional - can use in-memory storage for development)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database (Optional - uses in-memory storage by default)
   DATABASE_URL=postgresql://user:password@localhost:5432/hercules_sfms
   
   # JWT Secret (Required for production)
   JWT_SECRET=your-secure-secret-key-here
   
   # Google OAuth (Optional - for authentication)
   VITE_GOOGLE_CLIENT_ID=your-google-client-id
   ```

3. **Database Setup (Optional)**
   If using PostgreSQL:
   ```bash
   npm run db:push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5000`

## 📦 Production Build

### Building for Production

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm run start
   ```

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🏗️ Project Structure

```
hercules-sfms-production/
├── client/               # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Application pages/routes
│   │   ├── contexts/     # React context providers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions and configurations
│   │   └── App.tsx       # Main application component
│   └── public/           # Static assets
├── server/               # Express backend server
│   ├── routes/           # API route handlers
│   ├── plc/              # PLC communication modules
│   ├── gateway-files/    # Gateway integration files
│   ├── db.ts             # Database configuration
│   ├── storage.ts        # Storage interface
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schemas and types
├── migrations/           # Database migration files
├── package.json          # Project dependencies
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── drizzle.config.ts     # Drizzle ORM configuration
```

## 🔧 Configuration

### Development Mode Features

- **Demo Mode**: Access pre-configured demo dashboards without authentication
- **Custom Authentication**: Build your own authentication system
- **In-Memory Storage**: Run without database setup for quick testing

### Production Configuration

1. **Security**
   - Set strong JWT_SECRET in production
   - Configure CORS settings in server/index.ts
   - Enable HTTPS with SSL certificates

2. **Database**
   - Use PostgreSQL for production deployments
   - Configure connection pooling for performance

3. **Performance**
   - Enable compression middleware
   - Configure caching headers
   - Use CDN for static assets

## 🌟 Key Features

- **Real-Time Data Monitoring**: Live data visualization from PLCs and sensors
- **Custom Dashboard Builder**: Drag-and-drop dashboard creation
- **PLC Integration**: Support for multiple PLC protocols (S7, Modbus, OPC-UA)
- **Digital Twin Visualization**: 3D facility representations
- **Advanced Analytics**: Historical data analysis and reporting
- **Multi-Tenant Architecture**: Support for multiple facilities and users
- **Gateway Management**: Secure gateway deployment and monitoring

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Data Endpoints
- `GET /api/plc/devices` - List PLC devices
- `GET /api/plc/tags` - Get PLC tags
- `GET /api/plc/data` - Get real-time PLC data
- `GET /api/dashboard/widgets` - Get dashboard widgets
- `POST /api/dashboard/save` - Save dashboard configuration

### Gateway Endpoints
- `POST /api/gateway/activate` - Activate gateway
- `POST /api/gateway/data` - Receive gateway data
- `GET /api/gateway/status` - Get gateway status

## 🔒 Security Considerations

- Always use HTTPS in production
- Implement rate limiting for API endpoints
- Regularly update dependencies
- Use environment variables for sensitive configuration
- Implement proper session management
- Enable CORS only for trusted origins

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process on port 5000
   lsof -ti:5000 | xargs kill -9
   ```

2. **Database Connection Failed**
   - Check DATABASE_URL format
   - Ensure PostgreSQL is running
   - Verify database credentials

3. **Build Errors**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules dist
   npm install
   npm run build
   ```

## 📄 License

Copyright (c) 2025 Hercules SFMS. All rights reserved.

## 🤝 Support

For technical support and questions:
- Documentation: [Internal Wiki]
- Email: support@hercules-sfms.com
- Issue Tracker: [GitHub Issues]

---

Built with ❤️ using React, Express, TypeScript, and PostgreSQL