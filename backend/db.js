// Set up mongoose
const mongoose = require('mongoose')

const Promise = require('promise')

// Load the schemas
const User = require('./models/user.js')
const Post = require('./models/post')
const Report = require('./models/report')

module.exports = {

	connect: (url, callback) => {
		url = url || 'mongodb://localhost:27017/ucsharecar'
		mongoose.connect(url, { useNewUrlParser : true} )
		const db = mongoose.connection
		db.on('error', () => {
			console.error
			if (callback) callback()
		})
		db.once('open', () => {
			console.log('Connected to MongoDB Server')
			if (callback) callback()
		})
	},

	user: {
		// Creates a new user. user_info must follow the form defined by
		// models/user.js. Returns a promise. The promise will recieve the new
		// user id on the happy route, and an error in the error route.
		create: (user_info) => {
			const user = new User(user_info)
			return user.save().then((doc) => {
				console.log("Saved new user", user_info.email, "to DB")
				return doc._id
			}, (err) => {
				console.log("Failed to save new user", user_info.email)
				console.log(err)
				throw err
			})
		},

		// Args should be self explanatory.
		add_phnum: (id, phnum) => {
			return User.findByIdAndUpdate(id, { phnum: phnum }).then((doc) => {
				console.log("Successfully updated phnum for", id)
				return doc
			}, (err) => {
				console.log("For user", id, "add phnum error:", err)
				throw err
			})
		},

		// Takes an email. Returns a promise. The promise will call resolve if
		// the user is registered and reject if the user is not registered.
		// Resolve will get one argument, the user's id, if they are registered.
		check_registered: (email) => {
			return User.findByEmail(email).then((doc) => {
				if (!doc || !doc.phnum) {
					throw new Error("User not registered")
				}
				else {
					return doc.id
				}
			}, (err) => {
				console.log("Can't check if", email, "is registered")
				console.log(err)
				throw err
			})
		},

		find_with_id: (userid) => {
			return User.findById(userid).then((doc) => {
				if (!doc) {
					console.log("Could not find user", userid)
					throw new Error("Could not find user by id")
				}
				return doc
			}, (err) => {
				console.log("Error trying to find user", userid)
				console.log(err)
				throw err
			})
		}
	},

	post: {

		// Returns all posts in the db now
		find_all: () => {
			return new Promise((resolve, reject) => {
				const timeSort = {departtime : 1}
				Post.find().sort(timeSort).exec((err, posts) => {
					if(err) {
						console.log("Could not get all posts")
						console.log(err)
						reject(err)
					}
					else {
						resolve(posts)
					}
				})
			})
		},

		// Returns the specific post with post_id
		find_with_id: (post_id) => {
			return Post.findById(post_id).then((post) => {
				if (!post) {
					console.log("Failed to find post with id", post_id)
					throw new Error("Could not find post with id="+post_id)
				}
				else {
					return post
				}
			}, (err) => {
				consoe.log("Failed to find post with id", post_id)
				console.log(err)
				throw err
			})
		},

		// Returns posts which the start value matches
		find_start: (start_end) => {
			return new Promise((resolve, reject) => {
				const timeSort = {departtime : 1}
				var start_val = [ ]

				Post.find({"$and" : [{start : start_end.start}, {end : start_end.end}]}).sort(timeSort).exec((err, posts) => {
					if(err) {
						console.log("Could not get all posts")
						console.log(err)
						reject(err)
					}
					else {
						start_val.push(posts)
						Post.find({"$and" : [{start : start_end.start}, {end : {"$ne" : start_end.end}}]}).sort(timeSort).exec((err, posts) => {
							if(err) {
								console.log("Could not get all posts")
								console.log(err)
								reject(err)
							}
							else {
								start_val.push(posts)
								resolve(start_val)
							}
						})
					}
				})
			})
		},

		// Returns posts which the end value matches
		find_end: (start_end) => {
			return new Promise((resolve, reject) => {
				const timeSort = {departtime : 1}
				var start_val = [ ]

				Post.find({"$and" : [{start : start_end.start}, {end: start_end.end}]}).sort(timeSort).exec((err, posts) => {
					if(err) {
						console.log("Could not get all posts")
						console.log(err)
						reject(err)
					}
					else {
						start_val.push(posts)
						Post.find({"$and" : [{start : {"$ne" : start_end.start}}, {end : start_end.end}]}).sort(timeSort).exec((err, posts) => {
							if(err) {
								console.log("Could not get all posts")
								console.log(err)
								reject(err)
							}
							else {
								start_val.concat(posts)
								resolve(start_val)
							}
						})
					}
				})
			})
		},

		// Create new post
		create: (post_data) => {
			if (post_data.driver) {
				post_data.driverneeded = false
			}

			const post = new Post(post_data)
			return post.save().then((doc) => {
				console.log("Created post w/ id", doc.id)
				return doc.id
			}, (err) => {
				console.log("Failed to save post to DB")
				console.log(err)
				throw err
			})
		},

		add_driver: (post_id, user_id) => {
			return Post.findByIdAndUpdate(post_id, {
				driver: user_id,
				driverneeded: false,
			}).then(() => {
				console.log("Successfully added driver", user_id, "to", post_id)
			}, (err) => {
				console.log("Could not add driver", user_id, "to", post_id)
				console.log(err)
				throw err
			})
		},

		add_passenger: (post_id, user_id) => {

			return Post.findById(post_id).then((post) => {
				// If there is no driver yet, don't add passengers
				if (post.driverneeded) {
					console.log("No driver, cannot add", user_id, "to", post_id)
					throw new Error("No driver, cannot add passenger")
				}
				// If the passengers + 1 driver exceed seats, fail
				if (post.passengers.length+1 >= post.totalseats) {
					console.log("Not enough seats to add", user_id, "to", post_id)
					throw new Error("Not enough seats to add passenger")
				}

				post.passengers.push(user_id)
				return post.save().then(() => {
					console.log("Successfully added", user_id, "to", post_id, "as a passenger")
				}, (err) => {
					console.log("Could not add passenger", user_id, "to", post_id)
					console.log(err)
					throw err
				})
			}, (err) => {
				console.log("Could not add passenger", user_id, "to", post_id)
				console.log(err)
				throw err
			})

		},

		update: (post) => {
			// Make sure it's an actual mongoose object
			post = new Post(post)
			if (post.driver) {
				post.driverneeded = false
			}
			return post.save().then(() => {
				console.log("Updated post", post._id)
			}, (err) => {
				console.log("Failed to update post", post._id)
				console.log(err)
				throw err
			})
		},

		// Updates the driver or passenger status in the db
		update_post: (user_id, req) => {
			return new Promise((resolve, reject) => {
				Post.findById(req.params.post_id, (err, post) => {
					if(err) {
						console.log('database failure')
						reject(err)
					}
					if(!post) {
						console.log('post not found')
						resolve(null)
					}

					if(post.driverneeded) {
						post.driver = user_id
						post.driverneeded = false
					}
					else {
						post.passengers.push(user_id)
					}
					post.totalseats -= 1

					post.save((err) => {
						if(err) {
							console.log('failed to update')
							reject(err)
						}
						else {
							resolve(post)
						}
					})
				})
			})
		},
	},

	report : {
		create_report: (user_id, report_info) => {
			// report_info should have the fields reported, title, and body.
			return new Promise((resolve, reject) => {
				var report = new Report(report_info)

				report.uploader = user_id
				//reporttime file is deafult

				report.save((err) => {
					if(err) {
						console.log(err)
						reject(err)
					}
					else {
						resolve(report)
					}
				})
			})
		},
	},
}
