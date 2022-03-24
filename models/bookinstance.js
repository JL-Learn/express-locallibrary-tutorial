const { DateTime } = require("luxon");  //for date handling
let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/*  The BookInstance represents a specific copy of a book that someone might borrow 
    and includes information about whether the copy is available, on what date it is 
    expected back, and "imprint" (or version) details.
*/
let BookInstanceSchema = new Schema (

    {
        //reference to the associated book
        book: {type: Schema.Types.ObjectId, ref: 'Book', required: true},
        imprint: {type: String, required: true},
        
        /* enum: This allows us to set the allowed values of a string. In this case, 
            we use it to specify the availability status of our books (using an enum 
            means that we can prevent mis-spellings and arbitrary values for our status).
        */
        status: {type: String, required: true, enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'], default: 'Maintenance'},
        due_back: {type: Date, default: Date.now}
    }
);

// Virtual for this bookinstance object's URL.
BookInstanceSchema
.virtual('url')
.get(function () {

  return '/catalog/bookinstance/'+this._id;
});


BookInstanceSchema
.virtual('due_back_formatted')
.get(function () {

  return DateTime.fromJSDate(this.due_back).toLocaleString(DateTime.DATE_MED);
});

BookInstanceSchema
.virtual('due_back_yyyy_mm_dd')
.get(function () {

  return DateTime.fromJSDate(this.due_back).toISODate(); //format 'YYYY-MM-DD'
});

//Export model
module.exports = mongoose.model('BookInstance', BookInstanceSchema);
