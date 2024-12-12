import RouteRegister from './routeRegister.js';
import AccountsController from "./controllers/AccountsController.js";
import PostsController from './controllers/PostsController.js';

export const API_EndPoint = function (HttpContext) {
    return new Promise(async resolve => {
        if (!HttpContext.path.isAPI) {
            resolve(false);
        } else {
            let controllerName = HttpContext.path.controllerName;
            if (controllerName != undefined) {
                try {
                    // dynamically import the targeted controller
                    // if the controllerName does not exist the catch section will be called
                    const { default: Controller } = (await import('./controllers/' + controllerName + '.js'));

                    // instanciate the controller       
                    let controller = new Controller(HttpContext);
                    switch (HttpContext.req.method) {
                        case 'HEAD':
                            controller.head();
                            resolve(true);
                            break;
                        case 'GET':
                            controller.get(HttpContext.path.id);
                            resolve(true);
                            break;
                        case 'POST':
                            if (HttpContext.payload)
                                controller.post(HttpContext.payload);
                            else
                                HttpContext.response.unsupported();
                            resolve(true);
                            break;
                        case 'PUT':
                            if (HttpContext.payload)
                                controller.put(HttpContext.payload);
                            else
                                HttpContext.response.unsupported();
                            resolve(true);
                            break;
                        case 'DELETE':
                            controller.remove(HttpContext.path.id);
                            resolve(true);
                            break;
                        default:
                            HttpContext.response.notImplemented();
                            resolve(true);
                            break;
                    }
                } catch (error) {
                    console.log(BgRed + FgWhite, "API_EndPoint Error message: \n", `[${error.message}]`);
                    console.log(FgRed, "Stack: \n", error.stack);
                    HttpContext.response.notFound();
                    resolve(true);
                }
            } else {
                // not an API endpoint
                // must be handled by another middleware
                resolve(false);
            }
        }
    })
}

export const Registered_EndPoint = function (HttpContext) {
    return new Promise(async resolve => {
        let route = RouteRegister.find(HttpContext);
        if (route != null) {
            try {
                const { default: Controller } =
                    await import('./controllers/' + HttpContext.path.controllerName + '.js');
                let controller = new Controller(HttpContext);
                if (route.method === 'POST' || route.method === 'PUT') {
                    if (HttpContext.payload)
                        controller[route.actionName](HttpContext.payload);
                    else
                        HttpContext.response.unsupported();
                }
                else {
                    controller[route.actionName](route.id);
                }
                resolve(true);
            } catch (error) {
                console.log(BgRed + FgWhite, "Registered_EndPoint Error message: \n", error.message);
                console.log(FgRed, "Stack: \n", error.stack);
                HttpContext.response.notFound();
                resolve(true);
            }
        } else
            resolve(false);
    })
}


export const TOKEN_EndPoint = function (HttpContext) {
    if (HttpContext.req.url == '/token' && HttpContext.req.method == "POST") {
        try {
            let accountsController = new AccountsController(HttpContext);
            if (HttpContext.payload)
                accountsController.login(HttpContext.payload);
            else
                HttpContext.response.badRequest();
            return true;
        } catch (error) {
            console.log("Token_EndPoint Error message: \n", error.message);
            console.log("Stack: \n", error.stack);
            HttpContext.response.notFound();
            return true;
        }
    }
    // request not consumed
    // must be handled by another middleware
    return false;

}

export const PUT_EndPoint = function (HttpContext) {
    if (HttpContext.req.url.startsWith('/api/posts/') && HttpContext.req.method === "PUT") {
        try {
            const action = HttpContext.path.id; // Extract the action or post ID from the path

            let postsController = new PostsController(HttpContext);

                if (HttpContext.payload) {
                    // Call the addLike method and pass the payload
                    postsController.addLike(HttpContext.payload, HttpContext.payload.Id);
                } else {
                    HttpContext.response.badRequest("Payload is required for adding a like.");
                }

            return true; // Indicate the request was handled
        } catch (error) {
            console.error("PUT_EndPoint Error message: \n", error.message);
            console.error("Stack: \n", error.stack);
            HttpContext.response.internalServerError("An unexpected error occurred.");
            return true;
        }
    }

    // Request not consumed by this middleware
    return false;
};

export const ACCOUNTS_EndPoint = function (HttpContext) {
    if (HttpContext.req.url.startsWith('/accounts/getAvatar') && HttpContext.req.method == "GET") {
        try {
            let accountsController = new AccountsController(HttpContext);
            accountsController.getAvatar(HttpContext.path.params.id);
            return true;
        } catch (error) {
            console.log("Accounts_EndPoint Error message: \n", error.message);
            console.log("Stack: \n", error.stack);
            HttpContext.response.notFound();
            return true;
        }
    }
    // request not consumed
    // must be handled by another middleware
    return false;
}

