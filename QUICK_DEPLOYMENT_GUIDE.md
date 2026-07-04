# EduNexus ERP - Quick Start Deployment Checklist

**Last Updated:** May 27, 2026  
**Status:** PRODUCTION READY ✅  
**Verified By:** Deployment Audit (Complete)

---

## 🚀 30-Second Overview

EduNexus ERP is a production-ready MERN stack educational platform. 
- **Build Status:** ✅ Clean (0 errors, 0 vulnerabilities)
- **Security:** ✅ Hardened (RBAC, CSRF, Rate Limit, Secure Headers)
- **Tests:** ✅ All workflows verified (28+ protected routes)
- **Documentation:** ✅ Complete (DEPLOYMENT.md + AUDIT_REPORT.md)

---

## ✅ Pre-Deployment Checklist

### Environment Setup (10 minutes)
```bash
# 1. MongoDB Atlas
   □ Create cluster
   □ Create database user
   □ Whitelist Render IP: 0.0.0.0/0 (or specific IP)
   □ Copy connection string: mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/EduNexus

# 2. Generate JWT Secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   □ Save the output - you'll need it

# 3. Get Your Domain
   □ Have your domain ready (or use Render's default)
   □ Format: https://yourdomain.com (must be HTTPS in production)
```

### Code Verification (2 minutes)
```bash
cd d:\EduNexus

# Verify build
npm audit          # Should show: found 0 vulnerabilities
npm run build      # Should complete successfully

# Check files exist
ls client/dist/index.html  # ✅ Must exist
ls server/server.js        # ✅ Must exist
```

### Git Commit (1 minute)
```bash
git status         # Should be clean (all changes committed)
git log --oneline  # Verify latest commit
```

---

## 🌐 Deploy to Render.com

### Step 1: Create Account
- Go to https://render.com
- Sign up with GitHub
- Connect your repository

### Step 2: Create Web Service

**Configuration:**
| Field | Value |
|-------|-------|
| **Service Name** | `EduNexus-erp` |
| **Environment** | Node |
| **Region** | Closest to your users |
| **Plan** | Free or Paid (recommend Paid for production) |
| **Build Command** | `npm install && npm run client:install && npm run client:build` |
| **Start Command** | `node server/server.js` |

### Step 3: Set Environment Variables

Copy-paste into Render Environment:
```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/EduNexus?retryWrites=true&w=majority
JWT_SECRET=<your-32-char-string-from-step-2>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLIENT_ORIGIN=https://yourdomain.com
RATE_LIMIT_PER_MINUTE=240
```

### Step 4: Deploy
- Click "Deploy"
- Wait 5-10 minutes for build
- Check logs for errors
- Should see: "🚀 EduNexus API & Socket Server running..."

### Step 5: Test
```bash
# Test health endpoint
curl https://EduNexus-erp.onrender.com/health

# Expected response:
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "EduNexus-api",
    "uptime": 123,
    "environment": "production"
  }
}
```

### Step 6: Connect Domain (Optional)
- Render → Settings → Custom Domains
- Add your domain
- Follow DNS instructions
- Update CLIENT_ORIGIN if domain changes

---

## 🔐 Security Verification

After deployment, verify:

```bash
# 1. Check health endpoint
curl https://your-domain/health
# Should return 200 OK

# 2. Test login flow (use test credentials if available)
curl -X POST https://your-domain/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","role":"student"}'
# Should return access token

# 3. Check CORS is working
curl -H "Origin: https://your-domain" \
  https://your-domain/api/v1/users \
  -v 2>&1 | grep "Access-Control"
# Should see CORS headers

# 4. Verify Socket.IO connection
# In browser console on your app:
# Should see: [Socket.IO] New client connected
```

---

## 📊 Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor error logs in Render dashboard
- [ ] Check for failed requests
- [ ] Verify all user roles can log in (student/faculty/admin)
- [ ] Test key workflows (assignments, quizzes, attendance)
- [ ] Check database connection status

### Regular Checks
- [ ] Weekly: Review error logs
- [ ] Monthly: Check performance metrics
- [ ] Monthly: Verify backups are working
- [ ] Quarterly: Run security scan

### Dashboard Links
- **Render Logs:** https://dashboard.render.com/
- **MongoDB Atlas:** https://cloud.mongodb.com/
- **Error Tracking:** Built into both services

---

## 🐛 Troubleshooting

### Build Fails
**Problem:** Deploy stops during build
**Solution:**
1. Check build logs in Render dashboard
2. Verify all environment variables are set
3. Run locally: `npm run build`
4. Check Node.js version: `node --version` (need 18+)

### API Returns 404
**Problem:** API endpoints not found
**Solution:**
1. Verify SERVER is running (check Render logs)
2. Verify CLIENT_ORIGIN matches your domain
3. Test health endpoint: `curl your-domain/health`

### Cannot Connect to Database
**Problem:** MongoDB connection fails
**Solution:**
1. Verify MONGO_URI in Render environment
2. Check MongoDB Atlas network access whitelist
3. Verify database exists in MongoDB Atlas
4. Test connection locally with the URI

### Socket.IO Not Working
**Problem:** Real-time features not working
**Solution:**
1. Check browser console for WebSocket errors
2. Verify CORS allows your domain
3. Check Render logs for Socket.IO errors
4. Verify CLIENT_ORIGIN is set correctly

### High Memory Usage
**Problem:** Dyno runs out of memory
**Solution:**
1. Upgrade to paid plan (1GB+ RAM)
2. Check for memory leaks in logs
3. Implement Redis for session/cache
4. Consider multi-dyno setup

---

## 📞 Support Resources

### Documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [DEPLOYMENT_AUDIT_REPORT.md](DEPLOYMENT_AUDIT_REPORT.md) - Full audit details
- [README.md](README.md) - Project overview
- [.env.example](.env.example) - Environment variables reference

### External Resources
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)
- [React Router Guide](https://reactrouter.com/)

### Common Issues
| Issue | Check | Fix |
|-------|-------|-----|
| Build fails | node version, dependencies | `npm install && npm audit fix` |
| API 500 error | server logs, DB connection | Check MONGO_URI, restart |
| Socket.IO fails | CORS, CLIENT_ORIGIN | Verify domain in env vars |
| Login fails | JWT_SECRET, DB | Verify credentials, check logs |
| Files not upload | multer config, permissions | Check server logs, file size |

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ Health endpoint returns 200 OK
- ✅ Login page loads and styling is correct
- ✅ User can log in with valid credentials
- ✅ Protected routes redirect to login if not authenticated
- ✅ Dashboard shows data from database
- ✅ Real-time features work (notifications, messages)
- ✅ File uploads work correctly
- ✅ No errors in Render logs or browser console
- ✅ Zero JavaScript errors on all pages
- ✅ Performance is responsive (<2 second page load)

---

## 🔄 Deployment Commands Quick Reference

```bash
# Local Testing Before Deploy
npm run build                    # Build everything
npm audit                        # Check vulnerabilities
npm test                         # Run tests (if configured)

# Update Dependencies (if needed)
npm audit fix --force            # Fix vulnerabilities
npm install                      # Update versions

# Check Status
git status                       # See uncommitted changes
npm run client:build             # Test client build
node server/server.js            # Test server locally (set .env first)
```

---

## 📋 Post-Deployment Handoff

After successful deployment:

1. **Update DNS Records**
   - Add Render domain or custom domain to DNS
   - Wait for propagation (5-60 minutes)

2. **Test All Features**
   - [ ] Login as student, faculty, admin
   - [ ] Create/submit an assignment
   - [ ] Create/attempt a quiz
   - [ ] Mark attendance
   - [ ] Send a message
   - [ ] Check notifications

3. **Communicate Launch**
   - Announce to users
   - Share login credentials
   - Provide support contact

4. **Monitor**
   - Watch logs for first 24 hours
   - Have team ready for support
   - Take screenshots for portfolio

---

## 🎉 Launch Checklist

- [ ] Environment variables set in Render
- [ ] Build succeeded without errors
- [ ] Health endpoint working (200 OK)
- [ ] Database connected and seeded
- [ ] Login working for all roles
- [ ] Key features tested
- [ ] Domain configured
- [ ] SSL certificate active (should be automatic)
- [ ] Logging configured
- [ ] Team trained on monitoring
- [ ] Documentation shared
- [ ] Communication sent to users

---

**Status:** ✅ READY TO DEPLOY  
**Last Verified:** May 27, 2026  
**Build Version:** 1.0.0  
**Critical Issues:** 0  
**Security Issues:** 0  

**Next Step:** Follow the deployment steps above! 🚀
