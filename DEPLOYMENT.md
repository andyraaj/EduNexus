# EduNexus ERP - Production Deployment Guide

## Pre-Deployment Checklist

### ✅ Environment Configuration

1. **MongoDB Atlas Setup**
   - Create a cluster on MongoDB Atlas (https://www.mongodb.com/cloud/atlas)
   - Create a database user with strong password
   - Whitelist your Render IP (or use 0.0.0.0/0 for development)
   - Copy the connection URI: `mongodb+srv://username:password@cluster.xxxxx.mongodb.net/EduNexus?retryWrites=true&w=majority`

2. **Generate Strong JWT Secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   - Use this value for `JWT_SECRET` environment variable

3. **Prepare Environment Variables**
   - Copy `.env.example` to `.env` (for local testing)
   - Set the following for production:
     - `NODE_ENV=production`
     - `MONGO_URI=` (MongoDB Atlas connection string)
     - `JWT_SECRET=` (Strong random 32+ char string)
     - `CLIENT_ORIGIN=` (Your deployed domain, e.g., https://yourdomain.com)
     - `PORT=5000`

### ✅ Build Verification

```bash
# Install dependencies
npm install
npm --prefix client install

# Build the project
npm run build

# Verify no errors
npm run client:build
```

### ✅ Security Audits

- ✅ All npm vulnerabilities fixed (npm audit clean)
- ✅ JWT secrets are strong and random
- ✅ No hardcoded credentials in code
- ✅ CORS properly configured
- ✅ CSRF protection enabled
- ✅ Rate limiting enabled
- ✅ Security headers configured

## Deployment to Render

### Step 1: Create Render Account
- Visit https://render.com
- Sign up and connect GitHub repository

### Step 2: Create Web Service

1. **New Web Service**
   - Connect GitHub repository
   - Select the EduNexus repository
   - Name: `EduNexus-erp` (or your preference)
   - Environment: `Node`
   - Region: Choose closest to users
   - Build Command: `npm install && npm run client:install && npm run client:build`
   - Start Command: `node server/server.js`

2. **Set Environment Variables**
   - In Render dashboard, go to Service > Environment
   - Add the following:
     ```
     NODE_ENV=production
     PORT=5000
     MONGO_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/EduNexus?retryWrites=true&w=majority
     JWT_SECRET=<your-strong-random-secret>
     JWT_ACCESS_EXPIRES=15m
     JWT_REFRESH_EXPIRES=7d
     CLIENT_ORIGIN=https://yourdomain.com
     RATE_LIMIT_PER_MINUTE=240
     ```

3. **Verify Deployment**
   - Wait for build to complete (5-10 minutes)
   - Check logs for any errors
   - Test health endpoint: `https://your-service.onrender.com/health`
   - Expected response: `{ "success": true, "data": { "status": "ok", ... } }`

### Step 3: Configure Custom Domain

1. In Render dashboard:
   - Go to Settings > Custom Domains
   - Add your domain
   - Follow DNS configuration instructions from your domain provider

2. Update CORS Configuration:
   - If domain changes, update `CLIENT_ORIGIN` environment variable
   - Restart the service

### Step 4: Database Setup

1. **Connect MongoDB Atlas**
   - Already configured via `MONGO_URI` env var
   - Verify connection: Check MongoDB Atlas dashboard for active connections

2. **Seed Initial Data (Optional)**
   ```bash
   # If needed, run seed script to populate sample data
   npm run db:seed
   ```

## Production Monitoring

### Health Checks
- Render automatically monitors `/health` endpoint
- Response indicates server status and uptime

### Logs
- View logs in Render dashboard: Service > Logs
- Critical errors are logged with request IDs for tracing

### Performance
- Monitor build times and deployment status
- Check response times and error rates
- Use MongoDB Atlas dashboard to monitor database performance

## Troubleshooting

### Common Issues

#### Build Fails
- Check Node.js version compatibility (need Node 18+)
- Verify all dependencies are correct
- Check build logs for specific errors

#### API Connection Fails
- Verify `MONGO_URI` is correct
- Check MongoDB Atlas network access whitelist
- Verify JWT_SECRET is set

#### Frontend Shows 404
- Ensure client build succeeded (check `client/dist` exists)
- Verify Express serves `client/dist/index.html` for SPA fallback
- Check network tab in browser dev tools

#### Socket.IO Connection Fails
- Verify `CLIENT_ORIGIN` matches deployed URL
- Check CORS settings in server
- Verify websocket connections are not blocked by network

### Debug Mode
- Set `NODE_ENV=development` temporarily (not recommended in production)
- Check detailed server logs with timestamps and request IDs

## Post-Deployment

### Backup Strategy
- MongoDB Atlas backups are handled automatically (check settings)
- Set backup window during low-traffic hours

### Updates
- Test all updates in staging environment first
- Deployment triggers automatic restart
- Monitor health checks after deployment

### Security
- Regularly rotate `JWT_SECRET` (requires re-login for all users)
- Monitor audit logs for suspicious activity
- Keep dependencies updated with `npm audit fix`

## Performance Optimization

### Frontend
- Production build includes:
  - Tree-shaking of unused code
  - Minification and compression
  - Code splitting for faster initial load
  - Gzip compression (configured by Render)

### Backend
- Rate limiting prevents abuse
- Connection pooling for database
- Request/response caching where applicable
- Efficient database queries with proper indexing

### Network
- CDN available through Render (optional upgrade)
- Gzip compression enabled
- Image optimization recommended for frontend assets

## Documentation

For more details:
- `.env.example` - Environment variable reference
- `server/config/env.js` - Environment validation logic
- `docker-compose.yml` - Local development with Docker
- Original EduNexus documentation - Comprehensive feature guide

## Support

If you encounter issues:
1. Check server logs in Render dashboard
2. Verify all environment variables are set correctly
3. Test API endpoints using curl or Postman
4. Check browser console for frontend errors
5. Review MongoDB Atlas activity logs

## Security Reminders

🔒 **NEVER commit sensitive data**
- Keep `.env` file out of version control (already in .gitignore)
- Use strong, randomly generated secrets
- Rotate secrets periodically

🔐 **Production Best Practices**
- Enable 2FA on Render and MongoDB Atlas accounts
- Regularly review audit logs
- Keep dependencies updated
- Monitor error rates and anomalies
