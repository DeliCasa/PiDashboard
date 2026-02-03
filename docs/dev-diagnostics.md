# DEV Diagnostics Guide

Documentation for the DEV Diagnostics feature in PiDashboard.

## Overview

The DEV Diagnostics tab provides real-time observability into the DeliCasa system health, active sessions, and evidence captures. It enables operators to verify system status in under 60 seconds.

## Features

### Service Health Monitoring

The diagnostics panel displays health status for three core services:

| Service | Endpoint | Polling Interval |
|---------|----------|------------------|
| BridgeServer | `/api/dashboard/diagnostics/bridgeserver` | 5 seconds |
| PiOrchestrator | `/api/system/info` | 5 seconds |
| MinIO Storage | `/api/dashboard/diagnostics/minio` | 5 seconds |

#### Health Status Indicators

- **Healthy** (green): Service responding normally
- **Degraded** (yellow): Service responding but with warnings
- **Unhealthy** (red): Service failing or unreachable
- **Unknown** (gray): Service status cannot be determined

### Sessions Overview

Displays active purchase/evidence sessions with:
- Session ID and delivery ID
- Start time and status (Active/Completed/Cancelled)
- Capture count and last capture timestamp
- Stale capture warning (>5 minutes without capture)

Sessions polling: 10 seconds

### Evidence Thumbnails

Each session card can be expanded to show:
- Thumbnail grid of captured images
- Camera ID and capture timestamp
- Click to view full-size image with download option
- Presigned URLs for secure image access

## Accessing the Diagnostics Tab

1. Open PiDashboard in your browser
2. Click the **DEV** tab (stethoscope icon) in the navigation

## Troubleshooting

### BridgeServer Shows Unhealthy

1. Check BridgeServer logs: `dokku logs bridgeserver`
2. Verify database connectivity
3. Check MinIO connection

### PiOrchestrator Shows Unknown

1. SSH to Pi and check service: `sudo systemctl status piorchestrator`
2. View logs: `journalctl -u piorchestrator -f`
3. Verify network connectivity from dashboard

### MinIO Shows Unhealthy

1. Check MinIO service status
2. Verify bucket `delicasa-images` exists and is accessible
3. Check MinIO credentials in BridgeServer config

### Sessions Not Appearing

1. Verify active sessions exist on BridgeServer
2. Check network connectivity to BridgeServer
3. Review browser console for API errors

### Stale Capture Warnings

A session shows "stale" when no evidence has been captured in >5 minutes:
1. Check ESP32-CAM connectivity
2. Verify camera is powered and responding
3. Check PiOrchestrator camera logs

### Evidence Thumbnails Not Loading

1. Check presigned URL expiration
2. Verify MinIO accessibility from browser
3. Check for CORS issues in browser console

## API Endpoints

### Health Check Endpoints

```
GET /api/dashboard/diagnostics/bridgeserver
GET /api/system/info
GET /api/dashboard/diagnostics/minio
```

### Sessions Endpoints

```
GET /api/dashboard/diagnostics/sessions?status=active&limit=50
GET /api/dashboard/diagnostics/sessions/:sessionId
GET /api/dashboard/diagnostics/sessions/:sessionId/evidence
```

### Presign Endpoint

```
GET /api/dashboard/diagnostics/images/presign?key=<imageKey>&expiresIn=900
```

## Success Criteria Validation

The diagnostics feature meets these acceptance criteria:

- **SC-001**: Health status visible in <60 seconds
- **SC-002**: Health checks complete in <5 seconds
- **SC-003**: Sessions display with real-time updates
- **SC-004**: Thumbnails load in <3 seconds (95% of requests)

## Related Documentation

- [PiOrchestrator Service Management](../CLAUDE.md#piorchestrator-service)
- [BridgeServer Health Endpoints](https://github.com/yourorg/BridgeServer/docs/health.md)
- [ESP32-CAM Integration](./esp32-cam-setup.md)
