# Q-Remix IDE Project

## Important NPM Installation Note

When installing dependencies for this project, **always** use the following command:

```bash
# Frontend Setup
cd frontend
npm install --legacy-peer-deps
```
```bash
# Backend Setup
cd backend
npm install --legacy-peer-deps
```


### Example Usage

```bash
# Correct way to install dependencies
npm install --legacy-peer-deps

# When adding new packages
npm install [package-name] --legacy-peer-deps
```

**Note:** This approach helps avoid potential "Conflicting peer dependencies" errors during project setup and package installation.


## Run Backend

```bash
cd backend

npm run start
```

## Run frontend

```bash
cd frontend

npm run dev
```
