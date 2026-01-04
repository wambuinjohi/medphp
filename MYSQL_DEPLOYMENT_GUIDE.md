# MySQL Deployment Guide

Complete guide for deploying the application with MySQL as the primary database to production.

## Overview

This guide covers deploying to popular cloud platforms with MySQL support:
- AWS RDS for MySQL
- DigitalOcean MySQL
- Google Cloud MySQL
- Heroku (via JawsDB)
- Self-hosted MySQL servers

## Pre-Deployment Checklist

- [ ] MySQL 8.0+ available
- [ ] Database credentials secured
- [ ] Schema validated (run `database/mysql/schema.sql`)
- [ ] Data migration completed (see `POSTGRESQL_TO_MYSQL_MIGRATION.md`)
- [ ] All tests passing
- [ ] Security patches applied
- [ ] Backups configured
- [ ] Monitoring configured

## 1. AWS RDS for MySQL

### 1.1 Create RDS Instance

```bash
# Via AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier app-mysql-prod \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0.35 \
  --master-username admin \
  --master-user-password "YourSecurePassword123!" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --multi-az \
  --backup-retention-period 30 \
  --storage-encrypted
```

### 1.2 Configure Security Group

```bash
# Allow inbound MySQL traffic from your application
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 3306 \
  --source-security-group-id sg-app-xxxxx
```

### 1.3 Create Database

```bash
mysql -h your-rds-endpoint.amazonaws.com -u admin -p \
  < database/mysql/schema.sql
```

### 1.4 Environment Variables for AWS RDS

```env
# In your deployment platform (AWS Lambda, EC2, etc.)
MYSQL_HOST=app-mysql-prod.xxxxx.us-east-1.rds.amazonaws.com
MYSQL_USER=admin
MYSQL_PASSWORD=YourSecurePassword123!
MYSQL_DATABASE=app_database
MYSQL_PORT=3306

VITE_DATABASE_PROVIDER=mysql
```

### 1.5 RDS-Specific Optimizations

```typescript
// In src/server/db/mysql/connection.ts
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  
  // AWS RDS specific settings
  connectionLimit: 20,  // RDS free tier supports ~100 connections
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
  
  // SSL for RDS
  ssl: 'Amazon RDS',
  // OR
  // ssl: {
  //   ca: fs.readFileSync('rds-ca-bundle.pem')
  // }
});
```

## 2. DigitalOcean Managed Databases

### 2.1 Create Database Cluster

```bash
# Via DigitalOcean Console or doctl
doctl databases create \
  --engine mysql \
  --version 8.0 \
  --region sfo3 \
  --size db-s-2vcpu-4gb \
  app-mysql-prod
```

### 2.2 Get Connection Details

```bash
doctl databases get app-mysql-prod --format Host,User,Password
```

### 2.3 Create Database and Import Schema

```bash
# Create the app database
mysql -h db-xxxxx.a.db.ondigitalocean.com -u doadmin -p mysql \
  -e "CREATE DATABASE app_database CHARACTER SET utf8mb4;"

# Import schema
mysql -h db-xxxxx.a.db.ondigitalocean.com -u doadmin -p app_database \
  < database/mysql/schema.sql
```

### 2.4 Environment Variables for DigitalOcean

```env
MYSQL_HOST=db-xxxxx.a.db.ondigitalocean.com
MYSQL_USER=doadmin
MYSQL_PASSWORD=your-generated-password
MYSQL_DATABASE=app_database
MYSQL_PORT=25060

VITE_DATABASE_PROVIDER=mysql

# DigitalOcean requires SSL
MYSQL_SSL=true
```

### 2.5 DigitalOcean App Platform Deployment

Create `app.yaml`:

```yaml
name: invoice-app
services:
  - name: api
    github:
      repo: your-username/invoice-app
      branch: main
    build_command: npm run build
    run_command: npm run preview
    envs:
      - key: MYSQL_HOST
        value: ${db.hostname}
      - key: MYSQL_USER
        value: ${db.username}
      - key: MYSQL_PASSWORD
        value: ${db.password}
      - key: MYSQL_DATABASE
        value: ${db.database}
      - key: VITE_DATABASE_PROVIDER
        value: mysql

databases:
  - name: db
    engine: MYSQL
    version: "8.0"
    production: true
```

Deploy:

```bash
doctl apps create --spec app.yaml
```

## 3. Google Cloud SQL

### 3.1 Create Cloud SQL Instance

```bash
gcloud sql instances create app-mysql-prod \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --backup \
  --enable-bin-log
```

### 3.2 Create Database and User

```bash
# Create database
gcloud sql databases create app_database \
  --instance=app-mysql-prod \
  --charset=utf8mb4

# Create user
gcloud sql users create appuser \
  --instance=app-mysql-prod \
  --password='YourSecurePassword123!'

# Set root password
gcloud sql users set-password root \
  --instance=app-mysql-prod \
  --password='RootPassword123!'
```

### 3.3 Import Schema

```bash
# Get Cloud SQL Proxy
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
chmod +x cloud_sql_proxy

# Start proxy
./cloud_sql_proxy -instances=your-project:us-central1:app-mysql-prod=tcp:3306 &

# Import schema
mysql -h 127.0.0.1 -u root -p app_database < database/mysql/schema.sql
```

### 3.4 Environment Variables for Google Cloud

```env
# Use Cloud SQL Proxy or TCP connection
MYSQL_HOST=127.0.0.1  # When using Cloud SQL Proxy
# OR
MYSQL_HOST=your-instance-ip  # Direct connection

MYSQL_USER=appuser
MYSQL_PASSWORD=YourSecurePassword123!
MYSQL_DATABASE=app_database
MYSQL_PORT=3306

VITE_DATABASE_PROVIDER=mysql
```

### 3.5 Google Cloud Run Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy files
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Build
RUN npm run build

# Start
ENV PORT=3000
CMD ["npm", "run", "preview"]
```

Deploy:

```bash
gcloud run deploy invoice-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MYSQL_HOST=127.0.0.1,MYSQL_USER=appuser,MYSQL_PASSWORD=xxxxx,MYSQL_DATABASE=app_database,VITE_DATABASE_PROVIDER=mysql
```

## 4. Heroku with JawsDB

### 4.1 Add JawsDB Addon

```bash
heroku addons:create jawsdb:kitefin --app your-app-name
```

### 4.2 Get Connection Details

```bash
heroku config:get JAWSDB_URL --app your-app-name
# mysql://username:password@hostname:port/database
```

### 4.3 Environment Variables

JawsDB provides `JAWSDB_URL`. Parse it in your code:

```typescript
const url = new URL(process.env.JAWSDB_URL!);

const config = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  port: parseInt(url.port) || 3306,
};
```

Or set individual variables:

```bash
heroku config:set \
  MYSQL_HOST=your-host.jawsdb.com \
  MYSQL_USER=your-user \
  MYSQL_PASSWORD=your-password \
  MYSQL_DATABASE=your-database \
  VITE_DATABASE_PROVIDER=mysql
```

### 4.4 Deploy to Heroku

Create `Procfile`:

```
web: npm run preview
```

Deploy:

```bash
git push heroku main
heroku run "mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE < database/mysql/schema.sql"
```

## 5. Self-Hosted MySQL on Linux

### 5.1 Install MySQL Server

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mysql-server

# Start service
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 5.2 Initial Configuration

```bash
sudo mysql_secure_installation
# Follow prompts to set root password, remove test databases, etc.
```

### 5.3 Create Database and User

```bash
mysql -u root -p

CREATE DATABASE app_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'SecurePassword123!';

GRANT ALL PRIVILEGES ON app_database.* TO 'app_user'@'localhost';

# For remote connections
CREATE USER 'app_user'@'%' IDENTIFIED BY 'SecurePassword123!';
GRANT ALL PRIVILEGES ON app_database.* TO 'app_user'@'%';

FLUSH PRIVILEGES;
```

### 5.4 Import Schema

```bash
mysql -u app_user -p app_database < database/mysql/schema.sql
```

### 5.5 Configure Remote Access (if needed)

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
# Change bind-address to allow remote connections
bind-address = 0.0.0.0
```

Restart:

```bash
sudo systemctl restart mysql
```

### 5.6 Environment Variables

```env
MYSQL_HOST=your-server-ip
MYSQL_USER=app_user
MYSQL_PASSWORD=SecurePassword123!
MYSQL_DATABASE=app_database
MYSQL_PORT=3306

VITE_DATABASE_PROVIDER=mysql
```

## 6. Connection Pooling Configuration

### Optimize for Production

```typescript
// In src/server/db/mysql/connection.ts
const poolConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  
  // Production settings
  connectionLimit: 20,
  waitForConnections: true,
  queueLimit: 20,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
  maxIdle: 10000,  // Close idle connections after 10 seconds
  idleTimeout: 60000,  // Connection timeout
  decimalNumbers: true,
};
```

## 7. SSL/TLS Configuration

### For AWS RDS

```typescript
import fs from 'fs';

const pool = mysql.createPool({
  ...config,
  ssl: 'Amazon RDS',
});
```

### For Custom Certificates

```typescript
const pool = mysql.createPool({
  ...config,
  ssl: {
    ca: fs.readFileSync('ca-cert.pem'),
    cert: fs.readFileSync('client-cert.pem'),
    key: fs.readFileSync('client-key.pem'),
    rejectUnauthorized: true,
  },
});
```

## 8. Backup Strategy

### Automated Backups

**AWS RDS**: Backups are automatic (up to 35 days retention)

**DigitalOcean**: Automated backups available

**Google Cloud SQL**: Automatic daily backups

**Manual Backups**:

```bash
# Create backup
mysqldump -h localhost -u root -p app_database > backup-$(date +%Y%m%d).sql

# Restore backup
mysql -h localhost -u root -p app_database < backup-20240104.sql
```

### Backup to S3

```bash
# Backup to AWS S3
mysqldump -h localhost -u root -p app_database | \
  aws s3 cp - s3://your-bucket/backups/mysql-$(date +%Y%m%d).sql.gz
```

## 9. Monitoring and Logging

### Enable Slow Query Log

In MySQL configuration:

```ini
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2
```

### Monitor Database Size

```sql
SELECT 
  table_schema AS 'Database', 
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' 
FROM information_schema.tables 
GROUP BY table_schema;
```

### Set Up Alerts

**AWS CloudWatch**:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name mysql-high-connections \
  --alarm-description "Alert when connections exceed 80" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

## 10. Security Best Practices

### 1. Use Strong Passwords

```
Minimum: 16 characters, mix of uppercase, lowercase, numbers, special characters
Example: Tr0pic@lP@rr0t#2024
```

### 2. Restrict Network Access

```bash
# Only allow from application servers
GRANT ALL ON app_database.* TO 'app_user'@'10.0.1.0/255.255.255.0';
```

### 3. Enable SSL/TLS

```bash
# Require SSL connections
CREATE USER 'app_user'@'%' IDENTIFIED BY 'password' REQUIRE SSL;
```

### 4. Regular Updates

```bash
# AWS RDS: Enable automatic patches
# DigitalOcean: Enable automatic backups and maintenance
# Self-hosted: `sudo apt update && sudo apt upgrade`
```

### 5. Audit Logging

```sql
-- Enable audit logging
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'TABLE';

-- Review logs
SELECT * FROM mysql.general_log ORDER BY event_time DESC LIMIT 100;
```

## 11. Troubleshooting Deployment

### Issue: Connection Refused

**Symptoms**: `Error: connect ECONNREFUSED`

**Solutions**:
1. Verify MySQL is running: `sudo systemctl status mysql`
2. Check hostname/port configuration
3. Verify firewall rules allow database port
4. Test connection: `mysql -h host -u user -p`

### Issue: Too Many Connections

**Symptoms**: `Error: Too many connections`

**Solutions**:
1. Increase `max_connections` in MySQL config
2. Reduce connection pool size in application
3. Implement connection pooling
4. Check for connection leaks in application code

### Issue: Authentication Failed

**Symptoms**: `Error: Access denied for user`

**Solutions**:
1. Verify username/password
2. Check user privileges: `SHOW GRANTS FOR 'user'@'host';`
3. Verify host restrictions: `SELECT user, host FROM mysql.user;`
4. Reset user password if needed

### Issue: Slow Queries

**Symptoms**: High response times

**Solutions**:
1. Enable slow query log
2. Create missing indexes: `CREATE INDEX idx_name ON table(column);`
3. Optimize queries (see EXPLAIN output)
4. Increase server resources (AWS RDS instance type)

## 12. Rollback Plan

If you need to rollback to Supabase:

```env
VITE_DATABASE_PROVIDER=supabase
```

No data is lost - both databases can coexist during transition period.

## 13. Performance Benchmarks

Expected performance (vs Supabase):

| Operation | Supabase | MySQL | Notes |
|-----------|----------|-------|-------|
| Select 1000 rows | 200ms | 150ms | MySQL slightly faster |
| Insert | 100ms | 80ms | Better performance |
| Complex join | 300ms | 250ms | Query optimization needed |
| Authorization check | 150ms | 100ms | RLS vs app-level |

Actual performance depends on:
- Network latency
- Query complexity
- Database indexing
- Server resources

## 14. Cost Comparison

### AWS RDS (per month)

- **db.t3.micro**: ~$20 (free tier eligible)
- **db.t3.small**: ~$40
- **db.t3.medium**: ~$80
- **Multi-AZ**: +100% cost
- **Backups**: Included (35 days)

### DigitalOcean (per month)

- **db-s-1vcpu-1gb**: $15
- **db-s-2vcpu-4gb**: $30
- **db-s-4vcpu-8gb**: $60
- **Backups**: Included

### Google Cloud SQL (per month)

- **db-f1-micro**: ~$10
- **db-n1-standard-1**: ~$50
- **db-n1-standard-2**: ~$100
- **Backups**: Included

## Success Metrics

✅ Application connects successfully
✅ All CRUD operations work
✅ Authentication working
✅ Data integrity maintained
✅ Backups are automated
✅ Monitoring is configured
✅ Response times acceptable
✅ No connection errors
✅ Proper access controls in place
✅ Disaster recovery plan documented
