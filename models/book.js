let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/*  Most of this is similar to the author model — we've declared a schema with a 
    number of string fields and a virtual for getting the URL of specific book records, 
    and we've exported the model.
*/
let BookSchema = new Schema (

    {
        title: {type: String, required: true},

        // author is a reference to a single Author model object, and is required.
        title: {type: String, required: true},
        author: {type: Schema.Types.ObjectId, ref: 'Author', required: true},
        summary: {type: String, required: true},
        isbn: {type: String, required: true},

        // genre is a reference to an array of Genre model objects.
        genre: [{type: Schema.Types.ObjectId, ref: 'Genre'}]
    }
);

// Virtual for book's URL
BookSchema.virtual('url').get(function () {
    
    return '/catalog/book/' + this._id; 
});

//Export model
module.exports = mongoose.model('Book', BookSchema);