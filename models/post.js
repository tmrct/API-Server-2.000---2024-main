import Model from './model.js';

export default class Post extends Model {
    constructor() {
        super(true /* secured Id */);

        this.addField('Title', 'string');
        this.addField('Text', 'string');
        this.addField('Category', 'string');
        this.addField('Image', 'asset');
        this.addField('Date', 'integer');
        this.addField('UserId', 'string'); // Add UserId field to link to the user
        this.addField('Likes', 'object'); // Add Likes field to store the likes
        this.setKey("Title");
    }
}