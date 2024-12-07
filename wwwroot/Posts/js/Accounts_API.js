// Accounts_API.js
class Accounts_API {
    static Host_URL() { return "http://localhost:5000"; }
    static API_URL() { return this.Host_URL() + "api/accounts" };

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
                complete: data => { 
                    sessionStorage.setItem("access_token", data.responseJSON.Access_token);
                    sessionStorage.setItem("user", JSON.stringify(data.responseJSON.User));                    resolve({data});            
            },
                error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async logout() {
        this.initHttpState(); // Initialize error state tracking if needed
        return new Promise(resolve => {
            const userJson = sessionStorage.getItem("user");
            const user = userJson ? JSON.parse(userJson) : null;
            if (user && user.Id) {
                $.ajax({
                    method: 'GET',
                    contentType: 'application/json',
                    url: `${this.Host_URL()}/accounts/logout/${user.Id}`, // Include userId in the URL
                    data: { userId: user.Id }, // Correctly format the data
                    complete: data => {
                        sessionStorage.removeItem("access_token");
                        sessionStorage.removeItem("user");
                        resolve({ data });
                    },
                    error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
                });
            } else {
                // Handle case where user is not found in sessionStorage
                sessionStorage.removeItem("access_token");
                sessionStorage.removeItem("user");
                resolve(null);
            }
        });
    }
    static async Verify(code) {
        this.initHttpState(); // Initialize error state tracking if needed
        return new Promise(resolve => {
            const userJson = sessionStorage.getItem("user");
            const user = userJson ? JSON.parse(userJson) : null;
            const accessToken = sessionStorage.getItem("access_token");
            if (accessToken && user) {
                $.ajax({
                    method: 'GET',
                    contentType: 'application/json',
                    url: `${this.Host_URL()}/accounts/verify?id=${user.Id}&code=${code}`,
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    complete: data => {
                        resolve({ data });
                    },
                    error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
                });
            } else {
                // Handle case where access token or user is not found in sessionStorage
                resolve(null);
            }
        });
    }
    static Conflict() {
        return this.Host_URL()+"/accounts/conflict"
    }

    static async Register(data, create = true) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: create ? this.Host_URL() + "/accounts/register" : this.Host_URL() + "/accounts/" + data.Id,
                type: create ? "POST" : "PUT",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => { resolve(data); },
                error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }

}
