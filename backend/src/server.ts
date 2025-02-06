import app from './app';

const PORT = 5000; // Hardcoded port 

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});