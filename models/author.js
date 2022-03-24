let mongoose = require('mongoose');
const { DateTime } = require("luxon");  //for date handling
let Schema = mongoose.Schema;


/* The schema defines an author as having String SchemaTypes for the first 
    and family names (required, with a maximum of 100 characters), and 
    Date fields for the dates of birth and death.
*/
let AuthorSchema = new Schema (

    {
        first_name: {type: String, required: true, maxLength: 100},
        family_name: {type: String, required: true, maxLength: 100},
        date_of_birth: {type: Date},
        date_of_death: {type: Date},
    }
);

// Virtual for author "full" name.
AuthorSchema.virtual('name').get(function() {

    return this.family_name + ', ' + this.first_name;
});
  
// Virtual for this author instance URL.
AuthorSchema.virtual('url').get(function() {
      
    return '/catalog/author/' + this._id;
});
  
AuthorSchema.virtual('lifespan').get(function() {

    let lifetime_string = '';

    if (this.date_of_birth) {

      lifetime_string = DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED);
    }

    lifetime_string += ' - ';

    if (this.date_of_death) {

      lifetime_string += DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED)
    }

    return lifetime_string;
});
  
AuthorSchema.virtual('date_of_birth_yyyy_mm_dd').get(function() {

    //format 'YYYY-MM-DD'
    return DateTime.fromJSDate(this.date_of_birth).toISODate(); 
});
  
AuthorSchema.virtual('date_of_death_yyyy_mm_dd').get(function() {

    //format 'YYYY-MM-DD'
    return DateTime.fromJSDate(this.date_of_death).toISODate(); 
});  

//Export model
module.exports = mongoose.model('Author', AuthorSchema);