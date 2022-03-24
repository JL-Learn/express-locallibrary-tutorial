let Author = require('../models/author');
let async = require('async');
let Book = require('../models/book');

const { body,validationResult } = require('express-validator');

/* The author list page needs to display a list of all authors in the database, 
    with each author name linked to its associated author detail page. The date of 
    birth and date of death should be listed after the name on the same line.
*/

// Display list of all Authors.
exports.author_list = function (req, res, next) {

    /* The method uses the model's find(), sort() and exec() functions to return all Author 
        objects sorted by family_name in alphabetic order. The callback passed to the exec() 
        method is called with any errors (or null) as the first parameter, or a list of all 
        authors on success. If there is an error it calls the next middleware function with 
        the error value, and if not it renders the author_list(.pug) template, passing the 
        page title and the list of authors [author_list].
    */
    Author.find()
    .sort([['family_name', 'ascending']])
    .exec(function (err, list_authors) {

      if (err) { return next(err); }
      //Successful, so render
      res.render('author_list', { title: 'Author List', author_list: list_authors });
    });
};

// Display detail page for a specific Author.
/* The author detail page needs to display the information about the specified Author, 
    identified using their (automatically generated) _id field value, along with a list of 
    all the Book objects associated with that Author.
*/
exports.author_detail = function (req, res, next) {

    async.parallel({

        /* The method uses async.parallel() to query the Author 
            and their associated Book instances in parallel, with the 
            callback rendering the page when (if) both requests 
            complete successfully. The approach is exactly the same 
            as described for the Genre detail page above.
        */
        author: function(callback) {

            Author.findById(req.params.id)
            .exec(callback)
        },

        authors_books: function(callback) {

          Book.find({ 'author': req.params.id },'title summary')
          .exec(callback)
        },

    }, function(err, results) {

        if (err) { return next(err); } // Error in API usage.

        if (results.author==null) { // No results.

            var err = new Error('Author not found');
            err.status = 404;
            return next(err);
        }

        // Successful, so render.
        res.render('author_detail', { title: 'Author Detail', author: results.author, author_books: results.authors_books } );
    });
};

// Display Author create form on GET.
exports.author_create_get = function (req, res, next) {

    res.render('author_form', { title: 'Create Author'});
};

// Handle Author create on POST.
/* The structure and behavior of this code is almost exactly the same as for creating 
    a Genre object. First we validate and sanitize the data. If the data is invalid then 
    we re-display the form along with the data that was originally entered by the user 
    and a list of error messages. If the data is valid then we save the new author 
    record and redirect the user to the author detail page.

    Note: Unlike with the Genre post handler, we don't check whether the Author object 
    already exists before saving it. Arguably we should, though as it is now we can 
    have multiple authors with the same name.
*/
exports.author_create_post = [

    // Validate and sanitize fields.
    /* We can daisy chain validators, using withMessage() to specify the error message 
        to display if the previous validation method fails. This makes it very easy to provide 
        specific error messages without lots of code duplication.
    */
    body('first_name').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
    body('family_name').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
    .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
    /* We can use the optional() function to run a subsequent validation only if a field has been 
        entered (this allows us to validate optional fields). For example, below we check that the 
        optional date of birth is an ISO8601-compliant date (the checkFalsy flag means that we'll 
        accept either an empty string or null as an empty value).

        Parameters are received from the request as strings. We can use toDate() (or toBoolean()) 
        to cast these to the proper JavaScript types.
    */
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            // There are errors. Render form again with sanitized values/errors messages.
            res.render('author_form', { title: 'Create Author', author: req.body, errors: errors.array() });
            return;
        }
        else {

            // Data from form is valid.

            // Create an Author object with escaped and trimmed data.
            var author = new Author(
                {
                    first_name: req.body.first_name,
                    family_name: req.body.family_name,
                    date_of_birth: req.body.date_of_birth,
                    date_of_death: req.body.date_of_death
                });
            author.save(function (err) {

                if (err) { return next(err); }

                // Successful - redirect to new author record.
                res.redirect(author.url);
            });
        }
    }
];

// Display Author delete form on GET.
/* As discussed in the form design section, our strategy will be 
    to only allow deletion of objects that are not referenced by other 
    objects (in this case that means we won't allow an Author to be 
    deleted if it is referenced by a Book). In terms of implementation 
    this means that the form needs to confirm that there are no associated 
    books before the author is deleted. If there are associated books, it 
    should display them, and state that they must be deleted before the Author 
    object can be deleted.
*/
exports.author_delete_get = function (req, res, next) {

    /* The controller gets the id of the Author instance to be deleted from the URL 
        parameter (req.params.id). It uses the async.parallel() method to get the author 
        record and all associated books in parallel. When both operations have 
        completed it renders the author_delete.pug view, passing variables for the 
        title, author, and author_books.

        Note: If findById() returns no results the author is not in the database. 
        In this case there is nothing to delete, so we immediately render the 
        list of all authors.
    */
    async.parallel({

        author: function(callback) {

            Author.findById(req.params.id).exec(callback)
        },
        authors_books: function(callback) {

            Book.find({ 'author': req.params.id }).exec(callback)
        },
    }, function(err, results) {

        if (err) { return next(err); }

        if (results.author==null) { // No results.

            res.redirect('/catalog/authors');
        }

        // Successful, so render.
        res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books } );
    });
};

// Handle Author delete on POST.
exports.author_delete_post = function (req, res, next) {

    /* First we validate that an id has been provided (this is sent via the form body parameters, 
        rather than using the version in the URL). Then we get the author and their associated 
        books in the same way as for the GET route. If there are no books then we delete the 
        author object and redirect to the list of all authors. If there are still books then 
        we just re-render the form, passing in the author and list of books to be deleted.

        Note: We could check if the call to findById() returns any result, and if not, 
        immediately render the list of all authors. We've left the code as it is above 
        for brevity (it will still return the list of authors if the id is not found, 
        but this will happen after findByIdAndRemove()).
    */
    async.parallel({

        author: function(callback) {

          Author.findById(req.body.authorid).exec(callback)
        },
        authors_books: function(callback) {

          Book.find({ 'author': req.body.authorid }).exec(callback)
        },
    }, function(err, results) {

        if (err) { return next(err); }

        // Success
        if (results.authors_books.length > 0) {

            // Author has books. Render in same way as for GET route.
            res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books } );
            return;
        }
        else {
            // Author has no books. Delete object and redirect to the list of authors.
            Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {

                if (err) { return next(err); }

                // Success - go to author list
                res.redirect('/catalog/authors')
            })
        }
    });
};

// Display Author update form on GET.
exports.author_update_get = function (req, res, next) {

    Author.findById(req.params.id, function (err, author) {

        if (err) { return next(err); }

        if (author == null) { // No results.

            var err = new Error('Author not found');
            err.status = 404;
            return next(err);
        }
        // Success.
        res.render('author_form', { title: 'Update Author', author: author });
    });
}

exports.author_update_post = [

    // Validate and santize fields.
    body('first_name').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
        .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
    body('family_name').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),


    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create Author object with escaped and trimmed data (and the old id!)
        var author = new Author(
            {
                first_name: req.body.first_name,
                family_name: req.body.family_name,
                date_of_birth: req.body.date_of_birth,
                date_of_death: req.body.date_of_death,
                _id: req.params.id
            }
        );

        if (!errors.isEmpty()) {
            
            // There are errors. Render the form again with sanitized values and error messages.
            res.render('author_form', { title: 'Update Author', author: author, errors: errors.array() });
            return;
        }
        else {
            // Data from form is valid. Update the record.
            Author.findByIdAndUpdate(req.params.id, author, {}, function (err, theauthor) {

                if (err) { return next(err); }
                
                // Successful - redirect to genre detail page.
                res.redirect(theauthor.url);
            });
        }
    }
];