const { body,validationResult } = require("express-validator");
let Book = require('../models/book');
let async = require('async');
let Genre = require('../models/genre');

/* The genre detail page needs to display the information for a particular 
    genre instance, using its automatically generated _id field value as the identifier. 
    The page should display the genre name and a list of all books in the 
    genre with links to each book's details page.
*/

// Display list of all Genre.
exports.genre_list = function (req, res, next) {

    Genre.find()
    .sort([['name', 'ascending']])
    .exec(function (err, list_genres) {
        
      if (err) { return next(err); }
      // Successful, so render.
      res.render('genre_list', { title: 'Genre List', list_genres:  list_genres});
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = function (req, res, next) {

    /* The method uses async.parallel() to query the genre name and its 
        associated books in parallel, with the callback rendering the page 
        when (if) both requests complete successfully.

        The ID of the required genre record is encoded at the end of the URL 
        and extracted automatically based on the route definition (/genre/:id). 
        The ID is accessed within the controller via the request 
        parameters: req.params.id. It is used in Genre.findById() 
        to get the current genre. It is also used to get all Book objects 
        that have the genre ID in their genre field: Book.find({ 'genre': req.params.id }).

        Note: If the genre does not exist in the database (i.e. it may have been deleted) 
        then findById() will return successfully with no results. In this case we want to 
        display a "not found" page, so we create an Error object and pass it to the next 
        middleware function in the chain.

        if (results.genre==null) { // No results.
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        
        The message will then propagate through to our error handling code (this was 
        set up when we generated the app skeleton.
        The rendered view is genre_detail and it is passed variables for the title, 
        genre and the list of books in this genre (genre_books).
    */
    async.parallel({

        genre: function(callback) {

            Genre.findById(req.params.id)
            .exec(callback);
        },

        genre_books: function(callback) {

            Book.find({ 'genre': req.params.id })
            .exec(callback);
        },

    }, function(err, results) {

        if (err) { return next(err); }

        if (results.genre==null) { // No results.
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }

        // Successful, so render
        res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books } );
    });
};

// Display Genre create form on GET.
exports.genre_create_get = function (req, res, next) {

    res.render('genre_form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
/* The first thing to note is that instead of being a single middleware 
    function (with arguments (req, res, next)) the controller specifies an 
    array of middleware functions. The array is passed to the router function 
    and each method is called in order.

    Note: This approach is needed, because the validators are middleware functions.
*/
exports.genre_create_post =  [

    // Validate and sanitize the name field.
    /* The first method in the array defines a body validator (body()) that 
        validates and sanitizes the field. This uses trim() to remove any 
        trailing/leading whitespace, checks that the name field is not empty, 
        and then uses escape() to remove any dangerous HTML characters).
    */
    body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),
  
    // Process request after validation and sanitization.
    /* After specifying the validators we create a middleware function to 
        extract any validation errors. We use isEmpty() to check whether there are 
        any errors in the validation result. If there are then we render the form again, 
        passing in our sanitized genre object and the array of 
        error messages (errors.array()).
    */
    (req, res, next) => {
  
        // Extract the validation errors from a request.
        const errors = validationResult(req);
  
        // Create a genre object with escaped and trimmed data.
        let genre = new Genre(

            { name: req.body.name }
        );
  
        if (!errors.isEmpty()) {

            // There are errors. Render the form again with sanitized values/error messages.
            /* The same view is rendered in both the GET and POST controllers/routes when we 
                create a new Genre (and later on it is also used when we update a Genre). In the 
                GET case the form is empty, and we just pass a title variable. In the POST case 
                the user has previously entered invalid data—in the genre variable we pass back 
                a sanitized version of the entered data and in the errors variable we pass back 
                an array of error messages.
            */
            res.render('genre_form', { title: 'Create Genre', genre: genre, errors: errors.array()});
            return;
        }
        else {

            // Data from form is valid.
            // Check if Genre with same name already exists.
            /* If the genre name data is valid then we check if a Genre with the same 
                name already exists (as we don't want to create duplicates). If it does, 
                we redirect to the existing genre's detail page. If not, we save the new 
                Genre and redirect to its detail page.

                This same pattern is used in all our post controllers: we run 
                validators (with sanitizers), then check for errors and either 
                re-render the form with error information or save the data.
            */
            Genre.findOne({ 'name': req.body.name })
            .exec( function(err, found_genre) {

                if (err) { return next(err); }
  
                if (found_genre) {

                    // Genre exists, redirect to its detail page.
                    res.redirect(found_genre.url);
                }
                else {
  
                    genre.save(function (err) {

                        if (err) { return next(err); }

                        // Genre saved. Redirect to genre detail page.
                        res.redirect(genre.url);
                    });
                }
            });
        }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function (req, res, next) {

    async.parallel({

        genre: function(callback) {

            Genre.findById(req.params.id).exec(callback);
        },
        genre_books: function(callback) {

            Book.find({ 'genre': req.params.id }).exec(callback);
        },
    }, function(err, results) {

        if (err) { return next(err); }

        if (results.genre==null) { // No results.

            res.redirect('/catalog/genres');
        }
        // Successful, so render.
        res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books } );
    });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function (req, res, next) {

    async.parallel({

        genre: function(callback) {

            Genre.findById(req.params.id).exec(callback);
        },
        genre_books: function(callback) {

            Book.find({ 'genre': req.params.id }).exec(callback);
        },
    }, function(err, results) {

        if (err) { return next(err); }

        // Success
        if (results.genre_books.length > 0) {

            // Genre has books. Render in same way as for GET route.
            res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books } );
            return;
        }
        else {
            // Genre has no books. Delete object and redirect to the list of genres.
            Genre.findByIdAndRemove(req.body.id, function deleteGenre(err) {

                if (err) { return next(err); }

                // Success - go to genres list.
                res.redirect('/catalog/genres');
            });
        }
    });
};

// Display Genre update form on GET.
exports.genre_update_get = function (req, res, next) {

    Genre.findById(req.params.id, function(err, genre) {

        if (err) { return next(err); }

        if (genre==null) { // No results.

            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }

        // Success.
        res.render('genre_form', { title: 'Update Genre', genre: genre });
    });
};

// Handle Genre update on POST.
exports.genre_update_post = [
   
    // Validate and sanitze the name field.
    body('name', 'Genre name must contain at least 3 characters').trim().isLength({ min: 3 }).escape(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request .
        const errors = validationResult(req);

        // Create a genre object with escaped and trimmed data (and the old id!)
        var genre = new Genre(
          {
          name: req.body.name,
          _id: req.params.id
          }
        );

        if (!errors.isEmpty()) {

            // There are errors. Render the form again with sanitized values and error messages.
            res.render('genre_form', { title: 'Update Genre', genre: genre, errors: errors.array()});

            return;
        }
        else {
            // Data from form is valid. Update the record.
            Genre.findByIdAndUpdate(req.params.id, genre, {}, function (err,thegenre) {
                
                if (err) { return next(err); }

                // Successful - redirect to genre detail page.
                res.redirect(thegenre.url);
            });
        }
    }
];