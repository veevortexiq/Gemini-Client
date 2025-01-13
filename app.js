


////DO NOT MODIFY ANYTHING UNLESS IT'S UI RELATED



const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});