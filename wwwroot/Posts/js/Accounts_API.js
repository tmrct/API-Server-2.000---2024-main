// Accounts_API.js
class Accounts_API {
  static Host_URL() {
    return "http://localhost:5000";
  }
  static API_URL() {
    return this.Host_URL() + "api/accounts";
  }

  static initHttpState() {
    this.currentHttpError = "";
    this.currentStatus = 0;
    this.error = false;
  }
  static setHttpErrorState(xhr) {
    if (xhr.responseJSON)
      this.currentHttpError = xhr.responseJSON.error_description;
    else
      this.currentHttpError =
        xhr.statusText == "error" ? "Service introuvable" : xhr.statusText;
    this.currentStatus = xhr.status;
    this.error = true;
  }
  static async HEAD() {
    this.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.API_URL(),
        type: "HEAD",
        contentType: "text/plain",
        complete: (data) => {
          resolve(data.getResponseHeader("ETag"));
        },
        error: (xhr) => {
          this.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async Index(id){
    return new Promise((resolve) => {
      const accessToken = sessionStorage.getItem("access_token");
      $.ajax({
        method: "GET",
        contentType: "application/json",
        url: this.Host_URL() + `/accounts/index/`,
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { id: id },
        complete: (data) => {
          resolve({data});
        },
        error: (xhr) => {
          this.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async GetAvatar(id){
    return new Promise((resolve) => {
      const accessToken = sessionStorage.getItem("access_token");
      $.ajax({
        method: "GET",
        contentType: "application/json",
        url: this.Host_URL() + "/accounts/getAvatar",
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {id: id},
        complete: (data) => {
          resolve({data});
        },
        error: (xhr) => {
          this.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async Login(loginInfo) {
    this.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        method: "POST",
        contentType: "application/json",
        url: this.Host_URL() + "/token",
        data: JSON.stringify(loginInfo),
        complete: (data) => {
          sessionStorage.setItem(
            "access_token",
            data.responseJSON.Access_token
          );
          sessionStorage.setItem(
            "user",
            JSON.stringify(data.responseJSON.User)
          );
          resolve({ data });
        },
        error: (xhr) => {
          this.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }

  static async Promote(user){
    this.initHttpState();
    return new Promise((resolve)=>{
      const accessToken = sessionStorage.getItem("access_token");
      $.ajax({
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        contentType: "application/json",
        url: `${this.Host_URL()}/accounts/promote`,
        data: JSON.stringify(user),
        complete: (data)=>{
          resolve({ data });
        },
        error: (xhr) => {
          this.setHttpErrorState(xhr);
          resolve(null);
        }
      });
    });
  }
  static async logout() {
    this.initHttpState();
    return new Promise((resolve) => {
      const userJson = sessionStorage.getItem("user");
      const user = userJson ? JSON.parse(userJson) : null;
      if (user && user.Id) {
        $.ajax({
          method: "GET",
          contentType: "application/json",
          url: `${this.Host_URL()}/accounts/logout/${user.Id}`,
          data: { userId: user.Id },
          complete: (data) => {
            sessionStorage.removeItem("access_token");
            sessionStorage.removeItem("user");
            resolve({ data });
          },
          error: (xhr) => {
            this.setHttpErrorState(xhr);
            resolve(null);
          },
        });
      } else {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        location.reload();
        resolve(null);
      }
    });
  }
  static async Verify(code) {
    this.initHttpState();
    return new Promise((resolve) => {
      const userJson = sessionStorage.getItem("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const accessToken = sessionStorage.getItem("access_token");
      if (accessToken && user) {
        $.ajax({
          method: "GET",
          contentType: "application/json",
          url: `${this.Host_URL()}/accounts/verify?id=${user.Id}&code=${code}`,
          headers: { Authorization: `Bearer ${accessToken}` },
          complete: (data) => {
            if (data.responseJSON) {
              sessionStorage.setItem("user", JSON.stringify(data.responseJSON));
            }
            resolve({ data });
          },
          error: (xhr) => {
            this.setHttpErrorState(xhr);
            resolve(null);
          },
        });
      } else {
        resolve(null);
      }
    });
  }
  static Conflict() {
    return this.Host_URL() + "/accounts/conflict";
  }

  static async Register(data, create = true) {
    this.initHttpState();
    const accessToken = sessionStorage.getItem("access_token");
    return new Promise((resolve) => {
      const accessToken = sessionStorage.getItem("access_token");
      $.ajax({
        url: create
          ? this.Host_URL() + "/accounts/register"
          : this.Host_URL() + "/accounts/modify",
        type: create ? "POST" : "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        contentType: "application/json",
        headers: { Authorization: `Bearer ${accessToken}` },
        data: JSON.stringify(data),
        complete: (data) => {
          if(!create){
            sessionStorage.setItem(
              "user",
              JSON.stringify(data.responseJSON)
            );
          }

          resolve(data);
        },
        error: (xhr) => {
          this.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async Block(user){
    this.initHttpState();
    return new Promise((resolve) => {
      const accessToken = sessionStorage.getItem("access_token");
      $.ajax({
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        contentType: "application/json",
        url: `${this.Host_URL()}/accounts/block`,
        data : JSON.stringify(user),
        complete: (data)=>{
          resolve({ data });
        },
        error: (xhr) => {
          this.setHttpErrorState(xhr);
          resolve(null);
        }
      });
    });

  }
  static async Delete() {
    this.initHttpState();
    return new Promise((resolve) => {
      const accessToken = sessionStorage.getItem("access_token");
      const userJson = sessionStorage.getItem("user");
      const user = userJson ? JSON.parse(userJson) : null;
      $.ajax({
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        contentType: "application/json",
        url: `${this.Host_URL()}/accounts/remove/${user.Id}`,
        data: { userId: user.Id },
        complete: (data) => {
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("user");
          resolve({ data });
        },
        error: (xhr) => {
          this.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async DeleteAsAdmin(userId) {
    this.initHttpState();
    return new Promise((resolve) => {
      const accessToken = sessionStorage.getItem("access_token");
      $.ajax({
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        contentType: "application/json",
        url: `${this.Host_URL()}/accounts/remove/${userId}`,
        data: { userId: userId },
        complete: (data) => {
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("user");
          resolve({ data });
        },
        error: (xhr) => {
          this.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
}