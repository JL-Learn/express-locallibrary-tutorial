let BookInstance = require('../models/bookinstance');

const { body,validationResult } = require('express-validator');

// Require the Book module (needed because each BookInstance is associated with a particular Book).
let Book = require('../models/book');
let async = require('async')

/* This page needs to include the title of the Book associated with each 
    BookInstance (linked to its detail page) along with other information in 
    the BookInstance model, including the status, imprint, and unique id of 
    each copy. The unique id text should be linked to the BookInstance detail page.
*/

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res, next) {

    BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {

      if (err) { return next(err); }

      // Successful, so render
      /* The method uses the model's find() function to return all BookInstance objects. 
        It then daisy-chains a call to populate() with the book field—this will replace 
        the book id stored for each BookInstance with a full Book document.

        On success, the callback passed to the query renders the bookinstance_list(.pug) 
        template, passing the title and bookinstance_list as variables.
      */
      res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
    });
};

// Display detail page for a specific BookInstance.
/* The BookInstance detail page needs to display the information for each BookInstance, 
    identified using its (automatically generated) _id field value. This will include 
    the Book name (as a link to the Book detail page) along with other 
    information in the record.
*/
exports.bookinstance_detail = function (req, res, next) {

    /* The method calls BookInstance.findById() with the ID of a specific book
        instance extracted from the URL (using the route), and accessed within the 
        controller via the request parameters: req.params.id). It then calls populate() 
        to get the details of the associated Book.
    */
    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {

        if (err) { return next(err); }

        if (bookinstance==null) { // No results.

            var err = new Error('Book copy not found');
            err.status = 404;
            return next(err);
        }

        // Successful, so render.
        res.render('bookinstance_detail', { title: 'Copy: ' + bookinstance.book.title, bookinstance:  bookinstance});
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function (req, res, next) {

    Book.find({},'title')
    .exec(function (err, books) {

      if (err) { return next(err); }

      // Successful, so render.
      /* The controller gets a list of all books (book_list) and passes it to the 
        view bookinstance_form.pug (along with the title)
      */
      res.render('bookinstance_form', {title: 'Create BookInstance', book_list: books});
    });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [

    // Validate and sanitize fields.
    body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
    body('status').escape(),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),

    // Process request after validation and sanitization.
    /* The structure and behavior of this code is the same as for creating 
        our other objects. First we validate and sanitize the data. If the data 
        is invalid, we then re-display the form along with the data that was 
        originally entered by the user and a list of error messages. If the data 
        is valid, we save the new BookInstance record and redirect the user to 
        the detail page.
    */
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a BookInstance object with escaped and trimmed data.
        var bookinstance = new BookInstance(
        {   
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
        });

        if (!errors.isEmpty()) {

            // There are errors. Render form again with sanitized values and error messages.
            Book.find({},'title')
            .exec(function (err, books) {

                if (err) { return next(err); }

                // Successful, so render.
                res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id , errors: errors.array(), bookinstance: bookinstance });
            });
            return;
        }
        else {
            // Data from form is valid.
            bookinstance.save(function (err) {

                if (err) { return next(err); }

                // Successful - redirect to new record.
                res.redirect(bookinstance.url);
            });
        }
    }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function (req, res, next) {

    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {

        if (err) { return next(err); }

        if (bookinstance==null) { // No results.

            res.redirect('/catalog/bookinstances');
        }

        // Successful, so render.
        res.render('bookinstance_delete', { title: 'Delete BookInstance', bookinstance:  bookinstance});
    });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function (req, res, next) {

    // Assume valid BookInstance id in field.
    BookInstance.findByIdAndRemove(req.body.id, function deleteBookInstance(err) {

        if (err) { return next(err); }
        
        // Success, so redirect to list of BookInstance items.
        res.redirect('/catalog/bookinstances');
    });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function (req, res, next) {

    // Get book, authors and genres for form.
    async.parallel({

        bookinstance: function(callback) {

            BookInstance.findById(req.params.id).populate('book').exec(callback)
        },
        books: function(callback) {

            Book.find(callback)
        },
        }, function(err, results) {

        if (err) { return next(err); }

        if (results.bookinstance==null) { // No results.

            var err = new Error('Book copy not found');
            err.status = 404;
            return next(err);
        }

        // Success.
        res.render('bookinstance_form', { title: 'Update  BookInstance', book_list : results.books, selected_book : results.bookinstance.book._id, bookinstance:results.bookinstance });
    });     
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [

    // Validate and sanitize fields.
    body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
    body('status').escape(),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a BookInstance object with escaped/trimmed data and current id.
        var bookinstance = new BookInstance(
        { 
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back,
            _id: req.params.id
        });

        if (!errors.isEmpty()) {

            // There are errors so render the form again, passing sanitized values and errors.
            Book.find({},'title')
            .exec(function (err, books) {

                if (err) { return next(err); }

                // Successful, so render.
                res.render('bookinstance_form', { title: 'Update BookInstance', book_list : books, selected_book : bookinstance.book._id , errors: errors.array(), bookinstance:bookinstance });
            });

            return;
        }
        else {
            // Data from form is valid.
            BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err,thebookinstance) {

                if (err) { return next(err); }

                // Successful - redirect to detail page.
                res.redirect(thebookinstance.url);
            });
        }
    }
];