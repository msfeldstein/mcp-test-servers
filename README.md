# Ubuntu SSH Docker Container

This project provides a Docker container running Ubuntu with SSH access.

## Setup

1. Make sure you have Docker and Docker Compose installed on your system.

2. Create a shared directory for file exchange between host and container:
   ```
   mkdir -p shared
   ```

3. Build and start the container:
   ```
   docker-compose up -d
   ```

## Accessing the Container

### SSH Access

Connect to the container using SSH:
```
ssh ubuntu@localhost -p 2222
```

Password: `ubuntu`

You can also connect as root:
```
ssh root@localhost -p 2222
```

Password: `root`

### Direct Container Access

You can also access the container directly using Docker:
```
docker exec -it ubuntu-ssh bash
```

## Shared Files

The `./shared` directory on your host is mounted to `/home/ubuntu/shared` in the container. You can use this to exchange files between your host and the container.

## Stopping the Container

To stop the container:
```
docker-compose down
``` 