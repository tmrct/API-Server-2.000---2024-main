import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import AccessControl from '../accessControl.js';

export default class PostModelsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new PostModel()));
    }
    addLike(data, id) {
        if (AccessControl.writeGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (id !== '') {
                data = this.repository.update(id, data, false);
                if (this.repository.model.state.isValid) {
                    this.HttpContext.response.accepted(data);
                } else {
                    if (this.repository.model.state.notFound) {
                        this.HttpContext.response.notFound(this.repository.model.state.errors);
                    } else {
                        if (this.repository.model.state.inConflict)
                            this.HttpContext.response.conflict(this.repository.model.state.errors)
                        else
                            this.HttpContext.response.badRequest(this.repository.model.state.errors);
                    }
                }
            } else
                this.HttpContext.response.badRequest("The Id of ressource is not specified in the request url.");
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
}
