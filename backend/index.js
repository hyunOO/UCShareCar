const express = require('express')
const app = express()
const port = 8000

// GET request for users
app.get('/users', (req, res) => {
	res.json('This is where users will be GET')
});

// PUT request to create/register a new user
app.put('/users/register', (req, res) => {
	res.json({'success': true})
});

app.listen(port, (err) => {
	if (err) {
		return console.log('Failed to start:', err);
	}
	
	console.log('Running server on', port);
})