// Accounts_API.js
class Accounts_API {
    static Host_URL() { return "http://localhost:5000"; }
    static API_URL() { return this.Host_URL() + "/api/accounts" };

    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
        this.error = false;
    }
    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description;
        else
            this.currentHttpError = xhr.statusText == 'error' ? "Service introuvable" : xhr.statusText;
        this.currentStatus = xhr.status;
        this.error = true;
    }
    static async HEAD() {
        Posts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL(),
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => { resolve(data.getResponseHeader('ETag')); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Login(loginInfo) {
        this.initHttpState(); // Initialize error state tracking if needed
        return new Promise(resolve => {
            $.ajax({
                method: 'POST',
                contentType: 'application/json',
                url: this.Host_URL() + "/token",
                data: JSON.stringify(loginInfo),
                complete: data => { resolve({data}); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async GetLoggedInUser() {
        this.initHttpState();
        return new Promise(resolve=>{
            
        })
    }
    static Conflict() {
        return this.Host_URL()+"/accounts/conflict"
    }

    static async Save(data, create = true) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            console.log(data)
            // $.ajax({
            //     url: create ? this.API_URL() : this.API_URL() + "/" + data.Id,
            //     type: create ? "POST" : "PUT",
            //     contentType: 'application/json',
            //     data: JSON.stringify(data),
            //     success: (data) => { resolve(data); },
            //     error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
            // });
        });
    }

}
