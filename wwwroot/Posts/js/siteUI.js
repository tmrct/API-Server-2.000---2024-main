////// Author: Nicolas Chourot
////// 2024
//////////////////////////////
const periodicRefreshPeriod = 2;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;

let categories = [];
let selectedCategory = "";
let currentETag = "";
let currentPostsCount = -1;
let periodic_Refresh_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;

Init_UI();
async function Init_UI() {
  postsPanel = new PageManager(
    "postsScrollPanel",
    "postsPanel",
    "postSample",
    renderPosts
  );
  $("#createPost").on("click", async function () {
    showCreatePostForm();
  });
  $("#abort").on("click", async function () {
    showPosts();
  });
  $("#aboutCmd").on("click", function () {
    showAbout();
  });
  $("#showSearch").on("click", function () {
    toogleShowKeywords();
    showPosts();
  });
  $("#profileCmd").on("click", function () {
    showModifyAccountForm();
  });
  $("#manageUsersCmd").on("click", function () {
    showUserManagement();
  });

  installKeywordsOnkeyupEvent();
  await showPosts();
  start_Periodic_Refresh();
}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {
  $("#searchKeys").on("keyup", function () {
    clearTimeout(keywordsOnchangeTimger);
    keywordsOnchangeTimger = setTimeout(() => {
      cleanSearchKeywords();
      showPosts(true);
    }, keywordsOnchangeDelay);
  });
  $("#searchKeys").on("search", function () {
    showPosts(true);
  });
}
function cleanSearchKeywords() {
  /* Keep only keywords of 3 characters or more */
  let keywords = $("#searchKeys").val().trim().split(" ");
  let cleanedKeywords = "";
  keywords.forEach((keyword) => {
    if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
  });
  $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
  $("#hiddenIcon").hide();
  $("#showSearch").show();
  if (showKeywords) {
    $("#searchKeys").show();
  } else $("#searchKeys").hide();
}
function hideSearchIcon() {
  $("#hiddenIcon").show();
  $("#showSearch").hide();
  $("#searchKeys").hide();
}
function toogleShowKeywords() {
  showKeywords = !showKeywords;
  if (showKeywords) {
    $("#searchKeys").show();
    $("#searchKeys").focus();
  } else {
    $("#searchKeys").hide();
    showPosts(true);
  }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
  $("#createPost").show();
  $("#hiddenIcon").hide();
  $("#hiddenIcon2").hide();
  $("#menu").show();
  $("#commit").hide();
  $("#abort").hide();
  $("#form").hide();
  $("#form").empty();
  $("#aboutContainer").hide();
  $("#errorContainer").hide();
  showSearchIcon();
}

async function showPosts(reset = false) {
  intialView();
  $("#viewTitle").text("Fil de nouvelles");
  periodic_Refresh_paused = false;
  await postsPanel.show(reset);
}

async function showVerificationForm() {
  $("#viewTitle").text("Vérification de compte");
  periodic_Refresh_paused = true;

  renderVerificationForm();
}
async function showVerificationFormCreated() {
  $("#viewTitle").text("Vérification de compte");
  periodic_Refresh_paused = false;

  renderLoginForm(true);
}
function hidePosts() {
  postsPanel.hide();
  hideSearchIcon();
  $("#createPost").hide();
  $("#menu").hide();
  periodic_Refresh_paused = true;
}
function showForm() {
  hidePosts();
  $("#form").show();
  $("#commit").show();
  $("#abort").show();
}
function showError(message, details = "") {
  hidePosts();
  $("#form").hide();
  $("#form").empty();
  $("#hiddenIcon").show();
  $("#hiddenIcon2").show();
  $("#commit").hide();
  $("#abort").show();
  $("#viewTitle").text("Erreur du serveur...");
  $("#errorContainer").show();
  $("#errorContainer").empty();
  $("#errorContainer").append($(`<div>${message}</div>`));
  $("#errorContainer").append($(`<div>${details}</div>`));
}

function showCreatePostForm() {
  showForm();
  $("#viewTitle").text("Ajout de nouvelle");
  renderPostForm();
}
function showEditPostForm(id) {
  showForm();
  $("#viewTitle").text("Modification");
  renderEditPostForm(id);
}
function showDeletePostForm(id) {
  showForm();
  $("#viewTitle").text("Retrait");
  renderDeletePostForm(id);
}
function showDeletionConfirmation() {
  showForm();
  $("#commit").hide();
  $("#abort").hide();
  $("#viewTitle").text("Supprimer compte");
  renderDeleteAccountConfirmation();
}
function showAbout() {
  hidePosts();
  $("#hiddenIcon").show();
  $("#hiddenIcon2").show();
  $("#abort").show();
  $("#viewTitle").text("À propos...");
  $("#aboutContainer").show();
}
function getLoggedUser() {
  const userJson = sessionStorage.getItem("user");
  if (
    userJson === undefined ||
    userJson === null ||
    userJson == "undefined" ||
    userJson == "undefined"
  ) {
    return null;
  }
  return JSON.parse(userJson); // Parse JSON string to object
}

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function start_Periodic_Refresh() {
  $("#reloadPosts").addClass("white");
  $("#reloadPosts").on("click", async function () {
    $("#reloadPosts").addClass("white");
    postsPanel.resetScrollPosition();
    await showPosts();
  });
  setInterval(async () => {
    if (!periodic_Refresh_paused) {
      let etag = await Posts_API.HEAD();
      // the etag contain the number of model records in the following form
      // xxx-etag
      let postsCount = parseInt(etag.split("-")[0]);
      if (currentETag != etag) {
        if (postsCount != currentPostsCount) {
          console.log("postsCount", postsCount);
          currentPostsCount = postsCount;
          $("#reloadPosts").removeClass("white");
        } else await showPosts();
        currentETag = etag;
      }
    }
  }, periodicRefreshPeriod * 1000);
}
async function renderPosts(queryString) {
  let loggedUser = getLoggedUser();
  if (loggedUser == null || loggedUser.VerifyCode == "verified") {
    let endOfData = false;
    queryString += "&sort=date,desc";
    compileCategories();
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (showKeywords) {
      let keys = $("#searchKeys").val().replace(/[ ]/g, ",");
      if (keys !== "")
        queryString +=
          "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ",");
    }
    addWaitingGif();
    let response = await Posts_API.Get(queryString);
    //let user = await Posts_API.GetLoggedInUser();
    if (!Posts_API.error) {
      currentETag = response.ETag;
      currentPostsCount = parseInt(currentETag.split("-")[0]);
      let Posts = response.data;
      if (Posts.length > 0) {
        Posts.forEach((Post) => {
          postsPanel.append(renderPost(Post, getLoggedUser()));
        });
      } else endOfData = true;
      linefeeds_to_Html_br(".postText");
      highlightKeywords();
      attach_Posts_UI_Events_Callback();
    } else {
      showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
  } else {
    showVerificationForm();
  }
}
function renderVerificationForm() {
  $("#postsScrollPanel").hide();
  $("#form").show();
  $("#abort").hide();
  $("#form").empty();
  $("#form").append(`
        <form class="form" id="verificationForm">
            <label for="VerificationCode" class="form-label">Code de vérification</label>
            <input 
                class="form-control"
                name="VerificationCode"
                id="VerificationCode"
                type="number"
                placeholder="Entrez le code de vérification"
                required
            />
            <br>
            <input type="submit" value="Vérifier" id="verifyBtn" class="btn btn-primary">
        </form>
    `);

  $("#verificationForm").on("submit", async function (event) {
    event.preventDefault();
    let verificationData = getFormData($("#verificationForm"));
    let response = await Accounts_API.Verify(verificationData.VerificationCode);
    if (!Accounts_API.error) {
      await showPosts();
    } else {
      showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
    }
  });

  $("#cancel").on("click", async function () {
    await showPosts();
  });
}

function renderPost(post, loggedUser = null) {
  let date = convertToFrenchDate(UTC_To_Local(post.Date));
  let crudIcon = "";
  let likesCount = post.Likes ? Object.keys(post.Likes).length : 0;

  // Determine if loggedUser has liked the post
  let likedByUser = false;
  if (loggedUser && post.Likes) {
    likedByUser = Object.values(post.Likes).includes(loggedUser.Id);
  }

  // Set the like icon based on whether the user has liked the post or not
  let likeIconClass = likedByUser
    ? " like fa-thumbs-up fa-solid"
    : "like fa-thumbs-up fa-regular";

  if (loggedUser) {
    $("#createPost").hide();
    crudIcon = `
            <span></span>
            <span></span>
            <span class="${likeIconClass} cmdIconSmall" postId="${post.Id}" title="Aimer la nouvelle"></span>
            <span class="likesCount">${likesCount}</span>
            `;
    if (loggedUser.isSuper) {
      $("#createPost").show();
    }
    if (loggedUser.Id === post.UserId && loggedUser.isSuper) {
      $("#createPost").show();
      // User can edit and delete their own posts
      crudIcon = `
            <span class="editCmd cmdIconSmall fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>
            <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
            <span class="${likeIconClass} cmdIconSmall" postId="${post.Id}" title="Aimer la nouvelle"></span>
            <span class="likesCount">${likesCount}</span>
            `;
    } else if (loggedUser.isAdmin) {
      // Admin can only delete
      $("#createPost").hide();
      crudIcon = `
                <span></span>
                <span></span>
                <span></span>
                <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
            `;
    }
  } else {
    // No icons for unauthorized users
    crudIcon = "";
  }

  return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcon}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="postDate"> ${date} </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}
$(".like").off();
$(document).on("click", ".like", async function () {
  let loggedUserId = getLoggedUser().Id;
  let postId = $(this).attr("postId");
  let post = await Posts_API.Get(postId);

  let likesArray = Object.values(post.data.Likes);

  if (likesArray.includes(loggedUserId)) {
    likesArray = likesArray.filter((userId) => userId !== loggedUserId);
  } else {
    likesArray.push(loggedUserId);
  }

  post.data.Likes = {};
  likesArray.forEach((userId) => {
    post.data.Likes[userId] = userId;
  });
  const baseURL = "http://localhost:5000/assetsRepository/";
  if (post.data.Image.startsWith(baseURL)) {
    post.data.Image = post.data.Image.replace(baseURL, "");
  }
  const scrollPanel = $("#postsScrollPanel");
  const scrollPosition = scrollPanel.scrollTop();

  await Posts_API.addLike(post);
  if (!Posts_API.error) {
    await showPosts();
    // Restore the scroll position after rendering posts
  } else {
    showError("Une erreur est survenue! ", Posts_API.currentHttpError);
  }
  scrollPanel.scrollTop(scrollPosition);
});

async function compileCategories() {
  categories = [];
  let response = await Posts_API.GetQuery("?fields=category&sort=category");
  if (!Posts_API.error) {
    let items = response.data;
    if (items != null) {
      items.forEach((item) => {
        if (!categories.includes(item.Category)) categories.push(item.Category);
      });
      if (!categories.includes(selectedCategory)) selectedCategory = "";
      updateDropDownMenu(categories);
    }
  }
}

function updateDropDownMenu() {
  let loggedUser = getLoggedUser();
  let DDMenu = $("#DDMenu");
  let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
  DDMenu.empty();
  if (loggedUser) {
    // User is logged in
    if (loggedUser.isSuper) {
      $("#createPost").show();
    }

    $("#createPost").hide();
    DDMenu.append(
      $(`
            <div class="dropdown-item menuItemLayout" id="userCmd">
            <img src="${loggedUser.Avatar}" alt="Avatar" class="avatar" style="width: 35px; height: 35px; border-radius: 50%;">
            <span style="font-weight: bold; padding-left: 5px;">${loggedUser.Name}</span>
            </div>
            <div class="dropdown-divider"></div>
           <div class="dropdown-item" id="logoutCmd">

            <i class="menuIcon fa fa-sign-out mx-2"></i> Déconnexion
            </div>
            <div class="dropdown-item" id="profileCmd">
            <i class="menuIcon fa fa-user mx-2"></i> Modifier Profil
            </div>
            <div class="dropdown-divider"></div>
        `)
    );
    if (loggedUser.isAdmin) {
      $("#createPost").hide();
      DDMenu.append(
        $(`
                <div class="dropdown-item" id="manageUsersCmd">
                    <i class="menuIcon fa fa-users mx-2" id="manageUsersIcon"></i> Gestion des usagers
                </div>
                <div class="dropdown-divider"></div>
            `)
      );
      $("#manageUsersCmd").on("click", function () {
        showUserManagement();
      });
    }
  } else {
    // User is not logged in
    $("#createPost").hide();
    DDMenu.append(
      $(`
            <div class="dropdown-item" id="loginCmd">
                <i class="menuIcon fa fa-sign-in mx-2"></i> Connexion
            </div>
            <div class="dropdown-divider"></div>
        `)
    );
  }

  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
    `)
  );

  categories.forEach((category) => {
    selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
    DDMenu.append(
      $(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `)
    );
  });

  DDMenu.append($(`<div class="dropdown-divider"></div>`));
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
    `)
  );

  // Event handlers
  $("#aboutCmd").on("click", function () {
    showAbout();
  });

  $("#allCatCmd").on("click", async function () {
    selectedCategory = "";
    await showPosts(true);
    updateDropDownMenu();
  });

  $(".category").on("click", async function () {
    selectedCategory = $(this).text().trim();
    await showPosts(true);
    updateDropDownMenu();
  });

  if (loggedUser) {
    $("#logoutCmd").on("click", async function () {
      await Accounts_API.logout();
      location.reload();
    });

    $("#profileCmd").on("click", function () {
      showModifyAccountForm();
    });
  } else {
    $("#loginCmd").on("click", function () {
      showLoginAccountForm();
    });
  }
}
function attach_Posts_UI_Events_Callback() {
  linefeeds_to_Html_br(".postText");
  // attach icon command click event callback
  $(".editCmd").off();
  $(".editCmd").on("click", function () {
    showEditPostForm($(this).attr("postId"));
  });
  $(".deleteCmd").off();
  $(".deleteCmd").on("click", function () {
    showDeletePostForm($(this).attr("postId"));
  });
  $(".moreText").off();
  $(".moreText").click(function () {
    $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
    $(`.lessText[postId=${$(this).attr("postId")}]`).show();
    $(this).hide();
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass(
      "showExtra"
    );
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass(
      "hideExtra"
    );
  });
  $(".lessText").off();
  $(".lessText").click(function () {
    $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
    $(`.moreText[postId=${$(this).attr("postId")}]`).show();
    $(this).hide();
    postsPanel.scrollToElem($(this).attr("postId"));
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass(
      "hideExtra"
    );
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass(
      "showExtra"
    );
  });
}
function addWaitingGif() {
  clearTimeout(waiting);
  waiting = setTimeout(() => {
    postsPanel.itemsPanel.append(
      $(
        "<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"
      )
    );
  }, waitingGifTrigger);
}
function removeWaitingGif() {
  clearTimeout(waiting);
  $("#waitingGif").remove();
}

/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
  $.each($(selector), function () {
    let postText = $(this);
    var str = postText.html();
    var regex = /[\r\n]/g;
    postText.html(str.replace(regex, "<br>"));
  });
}
function highlight(text, elem) {
  text = text.trim();
  if (text.length >= minKeywordLenth) {
    var innerHTML = elem.innerHTML;
    let startIndex = 0;

    while (startIndex < innerHTML.length) {
      var normalizedHtml = innerHTML
        .toLocaleLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      var index = normalizedHtml.indexOf(text, startIndex);
      let highLightedText = "";
      if (index >= startIndex) {
        highLightedText =
          "<span class='highlight'>" +
          innerHTML.substring(index, index + text.length) +
          "</span>";
        innerHTML =
          innerHTML.substring(0, index) +
          highLightedText +
          innerHTML.substring(index + text.length);
        startIndex = index + highLightedText.length + 1;
      } else startIndex = innerHTML.length + 1;
    }
    elem.innerHTML = innerHTML;
  }
}
function highlightKeywords() {
  if (showKeywords) {
    let keywords = $("#searchKeys").val().split(" ");
    if (keywords.length > 0) {
      keywords.forEach((key) => {
        let titles = document.getElementsByClassName("postTitle");
        Array.from(titles).forEach((title) => {
          highlight(key, title);
        });
        let texts = document.getElementsByClassName("postText");
        Array.from(texts).forEach((text) => {
          highlight(key, text);
        });
      });
    }
  }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderEditPostForm(id) {
  $("#commit").show();
  addWaitingGif();
  let response = await Posts_API.Get(id);
  if (!Posts_API.error) {
    let Post = response.data;
    if (Post !== null) renderPostForm(Post);
    else showError("Post introuvable!");
  } else {
    showError(Posts_API.currentHttpError);
  }
  removeWaitingGif();
}
async function renderDeletePostForm(id) {
  let response = await Posts_API.Get(id);
  if (!Posts_API.error) {
    let post = response.data;
    if (post !== null) {
      let date = convertToFrenchDate(UTC_To_Local(post.Date));
      $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
      linefeeds_to_Html_br(".postText");
      // attach form buttons click event callback
      $("#commit").on("click", async function () {
        await Posts_API.Delete(post.Id);
        if (!Posts_API.error) {
          await showPosts();
        } else {
          console.log(Posts_API.currentHttpError);
          showError("Une erreur est survenue!");
        }
      });
      $("#cancel").on("click", async function () {
        await showPosts();
      });
    } else {
      showError("Post introuvable!");
    }
  } else showError(Posts_API.currentHttpError);
}
function newPost() {
  let Post = {};
  Post.Id = 0;
  Post.Title = "";
  Post.Text = "";
  Post.Image = "news-logo-upload.png";
  Post.Category = "";
  return Post;
}
function renderPostForm(post = null) {
  let create = post == null;
  if (create) post = newPost();
  $("#form").show();
  $("#form").empty();
  $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
  if (create) $("#keepDateControl").hide();

  initImageUploaders();
  initFormValidation(); // important do to after all html injection!

  $("#commit").click(function () {
    $("#commit").off();
    return $("#savePost").trigger("click");
  });
  $("#postForm").on("submit", async function (event) {
    event.preventDefault();
    let post = getFormData($("#postForm"));
    if (post.Category != selectedCategory) selectedCategory = "";
    if (create || !("keepDate" in post)) {
      post.Date = Local_to_UTC(Date.now());
      post.Likes = {};
      post.UserId = getLoggedUser().Id;
    } else {
      let response = await Posts_API.Get(post.Id);
      post.Likes = response.data.Likes;
      post.UserId = getLoggedUser().Id;
    }

    delete post.keepDate;
    post = await Posts_API.Save(post, create);
    if (!Posts_API.error) {
      await showPosts();
      postsPanel.scrollToElem(post.Id);
    } else showError("Une erreur est survenue! ", Posts_API.currentHttpError);
  });
  $("#cancel").on("click", async function () {
    await showPosts();
  });
}
function getFormData($form) {
  // prevent html injections
  const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
  var jsonObject = {};
  // grab data from all controls
  $.each($form.serializeArray(), (index, control) => {
    jsonObject[control.name] = control.value.replace(removeTag, "");
  });
  return jsonObject;
}

//////////////////////// Account rendering /////////////////////////////////////////////////////////////////
function showCreateAccountForm() {
  showForm();
  $("#viewTitle").text("Création de compte");
  renderAccountForm();
  $("#commit").hide();
}
function showModifyAccountForm() {
  showForm();
  $("#commit").hide();
  $("#viewTitle").text("Modification de compte");

  renderAccountForm(getLoggedUser());
}
function showUserManagement() {
  showForm();
  $("#commit").hide();
  $("#viewTitle").text("Gestion des usagers");

  renderUserManagement();
}
function showLoginAccountForm() {
  showForm();
  $("#viewTitle").text("Connexion");
  renderLoginForm();
}

function renderLoginForm(justCreated = false) {
  $("#commit").hide();
  $("#form").show();
  $("#form").empty();
  $("#form").append(`
            ${
              justCreated
                ? '<div class="alert alert-info"><strong>Veuillez prendre vos courriel pour récupérer votre code de vérification</strong></div>'
                : ""
            }
        <form class="form" id="loginForm">
            <label for="Email" class="form-label">Adresse de courriel </label>
            <input 
                class="form-control Email"
                name="Email"
                id="Email"
                placeholder="Courriel"
                required
                customErrorMessage="Courriel invalide"
            />
            <label for="Password" class="form-label">Mot de passe </label>
            <input 
                class="form-control"
                name="Password" 
                id="Password"
                type="password"
                placeholder="Mot de passe"
                required
                InvalidMessage="Mot de passe invalide"
                RequireMessage="Veuillez entrer un mot de passe"
            />
            <br>
            <input type="submit" value="Connexion" id="loginBtn" class="btn btn-primary">
        </form>
        <div class="bottomSection">
            <hr>
            <div class="form-group">
                <button type="button" id="createAccountBtn" class="btn btn-secondary">Créer un compte</button>
            </div>
        </div>
        <script>
            $('#createAccountBtn').on("click", function () {
                showCreateAccountForm();
            });
        </script>
    `);

  $("#commit").click(function () {
    $("#commit").off();
    return $("#loginAccount").trigger("click");
  });

  $("#loginForm").on("submit", async function (event) {
    event.preventDefault();
    let loginData = getFormData($("#loginForm"));
    let response = await Accounts_API.Login(loginData);
    if (!Accounts_API.error) {
      if (getLoggedUser().VerifyCode == "verified") {
        await showPosts();
      } else {
        await showVerificationForm();
      }
    } else {
      showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
    }
  });

  $("#cancel").on("click", async function () {
    await showPosts();
  });
}
async function renderUserManagement() {
  let allUsers = await Accounts_API.Index();
  allUsers = allUsers.data.responseJSON;

  $("#form").show();
  $("#form").empty();

  for (const user of allUsers) {
    if (user.Id != getLoggedUser().Id) {
      let userIsBlocked = user.isBlocked;
      let userIsAdmin = user.isAdmin;
      let userIsSuper = user.isSuper;
      let userId = user.Id;
      $("#form").append(`
          <div id="${userId}div" style="margin-top:2%;">
          <img class="avatar" style="width: 65px; height: 65px; border-radius: 50%; margin-left:2%;" src="${user.Avatar}"/>
          <span style="margin-left:2%;"> ${user.Name} </span>
          <span style="margin-left:2%;"> ${user.Email} </span>
          `);
      if (userIsAdmin) {
        $("#" + userId + "div").append(`
              <span id="demote" userId="${userId}" title="Déproumouvoir l'usager administrateur à un usager ordinaire" style="cursor:pointer; margin-left:2%;"><i title="Déproumouvoir l'usager administrateur à un usager ordinaire" class="fa-solid fa-user-gear fa-lg"></i></span>
              `);
      } else if (userIsSuper) {
        $("#" + userId + "div").append(`
              <span id="${userId}" class="promoteToAdmin" title="Promouvoir le super usager à un usager administrateur" style="cursor:pointer; margin-left:2%;"> <i title="Promouvoir le super usager à un usager administrateur" class="fa-solid fa-user-graduate fa-lg"></i> </span>
              <span id="${userId}" class="deleteUser" title="Supprimer l'usager" style="cursor:pointer; margin-left:2%;"> <i title="Supprimer l'usager" class="fa-solid fa-trash fa-lg"></i></span>
              `);
      } else {
        $("#" + userId + "div").append(`
              <span id="${userId}" class="promoteToSuper"  userId="${userId}" title="Promouvoir l'usager ordinaire à un super usager" style="cursor:pointer; margin-left:2%;"> <i title="Promouvoir l'usager ordinaire à un super usager" class="fa-solid fa-user fa-lg"></i></span>
              <span id="${userId}" class="deleteUser" title="Supprimer l'usager" style="cursor:pointer; margin-left:2%;"> <i title="Supprimer l'usager" class="fa-solid fa-trash fa-lg"></i></span>
              `);
      }
      if (userIsBlocked) {
        $("#" + userId + "div").append(`
              <span id="${userId}" class="unblock" title="Débloquer l'usager" style="cursor:pointer; margin-left:2%;"> <i  title="Débloquer l'usager" class="fa-solid fa-lock-open fa-lg"></i> </span>
              `);
      } else {
        $("#" + userId + "div").append(`
              <span id="${userId}" class="block" title="Bloquer l'usager" style="cursor:pointer; margin-left:2%;"> <i title="Bloquer l'usager" class="fa-solid fa-user-lock fa-lg"></i> </span>
              `);
      }
      $("#form").append(`
          </div>
          </br>
          `);
    }
  }
  $(".block").on("click", async function () {
    let userId = this.id;
    user = await Accounts_API.Index(userId)
    user = user.data.responseJSON[0]
    console.log(user);
    // await Accounts_API.Block(user)
    // console.log(user);
    // console.log("Block user:", userId);
  });
  $(".unblock").on("click", async function () {
    let userId = this.id;
    console.log("unblock user:", userId);
  });
  $(".promoteToSuper").on("click", function () {
    let userId = this.id;
    console.log("Promote to super user:", userId);
  });
  $(".promoteToAdmin").on("click", function () {
    let userId = this.id;
    console.log("Promote to admin user:", userId);
  });
  $(".demote").on("click", function () {
    let userId = this.id;
    console.log("Demote to normal user:", userId);
  });
  $(".deleteUser").on("click", function () {
    let userId = this.id;
    console.log("Delete user:", userId);
  });
}
function renderAccountForm(account = null) {
  let create = account == null;
  if (create) account = newAccount();
  $("#form").show();
  $("#form").empty();
  $("#form").append(`
        <form class="form" id="accountForm">
            <input type="hidden" name="Id" id="Id" value="${account.Id}"/>
             <input type="hidden" name="Created" id="Created" value="${
               account.Date
             }"/>
            <label for="Email" class="form-label">Adresse de courriel </label>
            <input 
                class="form-control Email"
                name="Email"
                id="Email"
                placeholder="Courriel"
                required
                value="${account.Email}"
                CustomErrorMessage= "Ce courriel est déjà utilisé"
            />
            <br/>
            <input 
                class="form-control MatchedInput "
                matchedInputId="Email"
                placeholder="Vérification"
                value="${account.Email}"
                required
                CustomErrorMessage= "Les courriels ne sont pas équivalents"
                InvalidMessage="Les courriels ne sont pas équivalents"
            />
            <label for="Password" class="form-label"> Mot de passe </label>
            <input 
                class="form-control"
                name="Password" 
                id="Password"
                type="password"
                placeholder="Mot de passe"
                ${create ? "required" : ""}
                RequireMessage="Veuillez entrez un mot de passe"
                InvalidMessage="Le mot de passe est invalide"
            />
            <br/>
            <input 
                class="form-control MatchedInput"
                type="password"
                matchedInputId="Password"
                placeholder="Vérification"
                ${create ? "required" : ""}
                RequireMessage="Vérification requise"
                InvalidMessage="Les mots de passes ne sont pas équivalents"
            />
            <label for="Name" class="form-label">Nom</label>
             <input class="form-control" 
                          name="Name" 
                          id="Name"
                          placeholder="Nom" 
                          required 
                          value='${account.Name}'
                          RequireMessage = 'Veuillez entrer un nom'
            </>
            <label class="form-label">Avatar </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Avatar' 
                     imageSrc='${account.Avatar}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <br/>
            <input type="submit" value="Enregistrer" id="createAccount" class="btn btn-primary" style="width:100%">
            <br/>
            <br/>
            `);
  if (create) {
    $("#form").append(`
                <button id="abortAccountForm" class="btn btn-secondary" style="width:100%"> Annuler </button>
                </form>
                `);
  } else {
    $("#form").append(`
                    <button id="deleteAccount" class="btn btn-warning" style="width:100%"> Supprimer </button>
                    </form>
                    `);
  }
  initImageUploaders();
  initFormValidation();

  $("#abortAccountForm").click(function () {
    showPosts();
  });
  $("#deleteAccount").click(function () {
    showDeletionConfirmation();
  });
  addConflictValidation(Accounts_API.Conflict(), "Email", "createAccount");

  $("#accountForm").on("submit", async function (event) {
    event.preventDefault();
    let account = getFormData($("#accountForm"));
    if (create) account.Created = Local_to_UTC(Date.now());
    account = await Accounts_API.Register(account, create);
    if (!Accounts_API.error && create) {
      await showVerificationFormCreated();
    } else if (!Accounts_API.error && !create) {
      await showPosts();
    } else
      showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
  });
  $("#cancel").on("click", async function () {
    await showPosts();
  });
}

function renderDeleteAccountConfirmation() {
  $("#form").show();
  $("#form").empty();
  $("#form").append(`
        <form class="form" id="deleteAccountForm">
            <br/>
            <div style="font-size:35px; font-family:bold; padding-left:75px;"> Voulez-vous vraiment effacer votre compte? </div>
            <br/>
            <button id="confirmDeleteAccount" class="btn" style="width:100%; background-color:#a90404; color:white;"> Effacer mon compte </button>
            <br/>
            <br/>
            <button id="cancelDeletion" class="btn btn-secondary" style="width:100%;"> Annuler </button>
        </form>
        `);
  $("#confirmDeleteAccount").click(async function (event) {
    event.preventDefault();
    let currentUserId = getLoggedUser().Id;
    let posts = await Posts_API.Get();
    posts = posts.data;
    for (const post of posts) {
      if (post.UserId == currentUserId) {
        Posts_API.Delete(post.Id);
      } else {
        let likes = post.Likes;
        if (likes && likes[currentUserId]) {
          Posts_API.addLike(post);
        }
      }
    }
    Accounts_API.Delete();
    showPosts();
  });

  $("#cancelDeletion").click(function () {
    showModifyAccountForm();
  });
}

function newAccount() {
  let Account = {};
  Account.Id = 0;
  Account.Name = "";
  Account.Email = "";
  Account.Password = "";
  Account.Avatar = "no-avatar.png";
  Account.Created = 0;
  Account.VerifyCode = "";
  Account.Authorizations = { readAccess: 1, writeAccess: 1 };
  return Account;
}
