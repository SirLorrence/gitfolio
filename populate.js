const fs = require("fs");
const emoji = require("github-emoji");
const jsdom = require("jsdom").JSDOM,
  options = {
    resources: "usable"
  };
const { getConfig, outDir } = require("./utils");
const { getRepos, getUser,getUserReadMe, getRepoReadMe } = require("./api");
const { resourceLimits } = require("worker_threads");

function convertToEmoji(text) {
  if (text == null) return;
  text = text.toString();
  var pattern = /(?<=:\s*).*?(?=\s*:)/gs;
  if (text.match(pattern) != null) {
    var str = text.match(pattern);
    str = str.filter(function(arr) {
      return /\S/.test(arr);
    });
    for (i = 0; i < str.length; i++) {
      if (emoji.URLS[str[i]] != undefined) {
        text = text.replace(
          `:${str[i]}:`,
          `<img src="${emoji.URLS[str[i]]}" class="emoji">`
        );
      }
    }
    return text;
  } else {
    return text;
  }
}

function createRepoPage(username,repoName){
  // if dir is null create a new one
  if(!fs.existsSync(`${outDir}/projects/`)){
    fs.mkdirSync(`${outDir}/projects`,
    {recursive:true},
    err =>{}
    );
  }

  let fileOutDir = `${outDir}/projects/${repoName}.html`;
  fs.copyFile(
    `${__dirname}/assets/blog/blogTemplate.html`,
    fileOutDir,
    err =>{
      if(err) throw err;
      // JSDOM parses and interacts with HTML
      jsdom 
      .fromFile(fileOutDir,options)
      .then(async function(dom) {
        // adding style ref line
        let window = dom.window, document = window.document;
        let style = document.createElement("link");
        style.setAttribute("rel","stylesheet");
        style.setAttribute("href", "../../index.css");
        document.getElementsByTagName("head")[0].appendChild(style);

        // setting page elements
        document.getElementsByTagName("title")[0].textContent = repoName;
        const repoText = await getRepoReadMe(username,repoName);
        document.getElementById("project").textContent = repoText;

      }

      // fs.writeFile(
      //   fileOutDir,
      //   "<!DOCTYPE html>" + window.document.documentElement.outerHTML,
      //   async function(error){
      //     if(error) throw error;
      //   }
      // )

      );
    }
  
  )
}

//============ Actcul population

module.exports.updateHTML = (username, opts) => {
  const {resume, linkedin, medium, discord, steam} = opts;
  //add data to assets/index.html
  jsdom
    .fromFile(`${__dirname}/assets/index.html`, options)
    .then(function(dom) {
      let window = dom.window,
        document = window.document;
      (async () => {
        try {
          console.log("Building HTML/CSS...");
          const repos = await getRepos(username, opts);
        //  console.log(repos)

          for (var i = 0; i < repos.length; i++) {
            let element;
            // console.log(i)
            element = document.getElementById("work_section"); 
            
            //====== Hard coded for pinned repros

            // if (repos[i].fork == false) {
            //   element = document.getElementById("work_section");
            // } else if (includeFork == true) {
            //   document.getElementById("forks").style.display = "block";
            //   element = document.getElementById("forks_section");
            // } else {
            //   continue;
            // }
            // console.log(repos)
            element.innerHTML += `
                        <a href="${repos[i].link}" target="_blank">
                        <section>
                            <div class="section_title">${repos[i].repo}</div>
                            <div class="about_section">
                            <span style="display:${
                              repos[i].description == undefined
                                ? "none"
                                : "block"
                            };">${convertToEmoji(repos[i].description)}</span>
                            </div>
                            <div class="bottom_section">
                                <span style="display:${
                                  repos[i].language == null
                                    ? "none"
                                    : "inline-block"
                                };"><i class="fas fa-code"></i>&nbsp; ${
              repos[i].language
            }</span>

                            </div>
                        </section>
                        </a>`;
            //Create Page

          }

          //========= Populate User About Readme

          const ReadMeTest = await getUserReadMe(username);
          let readElement = document.getElementById("markdown_section"); 
          readElement.innerHTML += ReadMeTest;


          //========== Populate User Info

          const user = await getUser(username);
          document.title = user.login;
          var icon = document.createElement("link");
          icon.setAttribute("rel", "icon");
          icon.setAttribute("href", user.avatar_url);
          icon.setAttribute("type", "image/png");

          document.getElementsByTagName("head")[0].appendChild(icon);
          document.getElementById(
            "profile_img"
          ).style.background = `url('${user.avatar_url}') center center`;
          document.getElementById(
            "username"
          ).innerHTML = `<span style="display:${
            user.name == null || !user.name ? "none" : "block"
          };">${user.name}</span><a href="${user.html_url}">@${user.login}</a>`;
          //document.getElementById("github_link").href = `https://github.com/${user.login}`;
          document.getElementById("userbio").innerHTML = convertToEmoji(
            user.bio
          );
          document.getElementById("userbio").style.display =
            user.bio == null || !user.bio ? "none" : "block";
          document.getElementById("about").innerHTML = `
                <span style="display:${
                  user.company == null || !user.company ? "none" : "block"
                };"><i class="fas fa-users"></i> &nbsp; ${user.company}</span>
                <span style="display:${
                  user.email == null || !user.email ? "none" : "block"
                };"><i class="fas fa-envelope"></i> &nbsp; ${user.email}</span>
                <span style="display:${
                  user.blog == null || !user.blog ? "none" : "block"
                };"><i class="fas fa-link"></i> &nbsp; <a href="${user.blog}">${
            user.blog
          }</a></span>
                <span style="display:${
                  user.location == null || !user.location ? "none" : "block"
                };"><i class="fas fa-map-marker-alt"></i> &nbsp;&nbsp; ${
            user.location
          }</span>
                <span style="display:${
                  resume == null ? "none" : "block"
                };"><i class="fas fa-user-tie"></i> &nbsp;&nbsp;<a href="${resume}">Résumé</a></span>
                <div class="socials">
                <span style="display:${
                  steam == null ? "none !important" : "block"
                };"><a href="https://steamcommunity.com/id/${steam}" target="_blank" class="socials"><i class="fab fa-steam"></i></a></span>
                <span style="display:${
                  discord == null ? "none !important" : "block"
                };"><a href="https://discordapp.com/users/${discord}" target="_blank" class="socials"><i class="fab fa-discord"></i></a></span>
                <span style="display:${
                  linkedin == null ? "none !important" : "block"
                };"><a href="https://www.linkedin.com/in/${linkedin}/" target="_blank" class="socials"><i class="fab fa-linkedin-in"></i></a></span>
                <span style="display:${
                  medium == null ? "none !important" : "block"
                };"><a href="https://www.medium.com/@${medium}/" target="_blank" class="socials"><i class="fab fa-medium-m"></i></a></span>
                </div>
                `;
          //add data to config.json
          const data = await getConfig();
          data[0].username = user.login;
          data[0].name = user.name;
          data[0].userimg = user.avatar_url;

          await fs.writeFile(
            `${outDir}/config.json`,
            JSON.stringify(data, null, " "),
            function(err) {
              if (err) throw err;
              console.log("Config file updated.");
            }
          );
          await fs.writeFile(
            `${outDir}/index.html`,
            "<!DOCTYPE html>" + window.document.documentElement.outerHTML,
            function(error) {
              if (error) throw error;
              console.log(`Build Complete, Files can be Found @ ${outDir}\n`);
            }
          );
        } catch (error) {
          console.log(error);
        }
      })();
    })
    .catch(function(error) {
      console.log(error);
    });
};
