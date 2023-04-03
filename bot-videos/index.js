const express = require('express')
const app = express()
const port = 3000
const moment = require('moment')
const db = require("./config/db")
const fs = require('fs')
const axios = require('axios')

const puppeteer = require('puppeteer');

app.use(express.json());
app.use(express.urlencoded());


async function createBrowser() {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        executablePath: '/usr/bin/chromium'
    });

    return browser
}

function reverseArr(input) {
    var ret = new Array;
    for(var i = input.length-1; i >= 0; i--) {
        ret.push(input[i]);
    }
    return ret;
 }

async function scrollBottom(page, timer=1000){
    await page.evaluate(()=> {
     
       const wait = (duration) => { 
         console.log('waiting', duration);
         return new Promise(resolve => setTimeout(resolve, duration)); 
       };
   
       (async () => {
         
         window.atBottom = false;
         const scroller = document.documentElement;  // usually what you want to scroll, but not always
         let lastPosition = -1;
         while(!window.atBottom) {
           scroller.scrollTop += 1000;
           // scrolling down all at once has pitfalls on some sites: scroller.scrollTop = scroller.scrollHeight;
           await wait(500);
           const currentPosition = scroller.scrollTop;
           if (currentPosition > lastPosition) {
             console.log('currentPosition', currentPosition);
             lastPosition = currentPosition;
           }
           else {
             window.atBottom = true;
           }
         }
         console.log('Done!');
   
       })();
   
    });
   
    await page.waitForFunction('window.atBottom == true', {
       timeout: 900000,
       polling: timer // poll for finish every second
    });
 }
 

async function scrapYoutube(url) {
    let browser = null
    try {
        browser = await createBrowser();
        const page = await browser.newPage();

        await page.setViewport({
            width: 2560,
            height: 1080,
         });
        await page.goto(url, {
            timeout: 20000,
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
        })
    
        const agree = await page.evaluate(() => {
            let result = ''
            for (const a of document.querySelectorAll("span")) {
                result += a.textContent
                if (a.textContent.includes("Accept all")) {
                    console.log(a.textContent)
                    a.click()
                }
            }
            return result
        });
    
        await page.waitForNavigation()
    
        await page.screenshot({
            path: 'youtube1.png',
            clip: {
                x: 0,
                y: 0,
                width: 2560,
                height: 1080,
                scale: 1
            }
        });

        for (let index = 0; index < 50; index++) {
            //console.log("inicio scroll", index)
            await scrollBottom(page)
            //await page.waitForTimeout(3000)
        }

        await page.screenshot({
            path: 'youtube2.png',
            clip: {
                x: 0,
                y: 0,
                width: 2560,
                height: 1080,
                scale: 1
            }
        });

        
    
        const result = await page.evaluate(() => {
            var links = []
            var div_videos = document.querySelectorAll("ytd-rich-grid-media.style-scope")
            console.log(div_videos)
            for (var i = 0; i < div_videos.length; i++) {
                let link = div_videos[i].querySelector("div:nth-child(1) > ytd-thumbnail:nth-child(1) > a:nth-child(1)").getAttribute("href")
                console.log(link)
                link = link.replace('/watch?v=', '')
                links.push(link)
            }
            return links
    
        })

        return result


    } catch (error) {
        console.log("error scrap youtube", error)
    }finally{
         if (browser) {
            browser.close();
        }
    }
  
}

async function arrayRumbelVideos(page){
    const result = await page.evaluate(() => {
       var links =[]
       var div_videos = document.querySelectorAll(".video-listing-entry")
 
       for (var i=0; i<div_videos.length; i++){
          let link = div_videos[i].querySelector('.video-item--a').getAttribute("href")
          link = "https://rumble.com"+link
          links.push(link)
       }
       return links
    })
    return result
}

async function  checaPagination(page){
    const pageClicked = await page.evaluate(() => {
       return !!document.querySelector('.paginator--ul > .paginator--li.paginator--li--next') // !! converts anything to boolean
    })
 
    return pageClicked;
}

    
async function scrapRumbel(url){
    let browser = null
    try {
        browser = await createBrowser();
        const page = await browser.newPage();

        await page.setViewport({
            width: 2560,
            height: 1080,
         });
        await page.goto(url, {
            timeout: 20000,
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
        })

        let videos_array
        const videos_link = await arrayRumbelVideos(page)
     
        videos_array = videos_link
     
        
        while (await checaPagination(page)) {
           await  page.click(".paginator--ul > .paginator--li.paginator--li--next");
           await page.waitForTimeout(1000)
           let next_links = await arrayRumbelVideos(page)
           videos_array.push(...next_links)
        }
        
        //
        
        return videos_array;
    } catch (error) {
        console.log("error scrap youtube", error)
    }finally{
         if (browser) {
            browser.close();
        }
    }
   
}
async function scrapOdysee(url){
    let browser = null
    try {
        browser = await createBrowser();
        const page = await browser.newPage();

        await page.setViewport({
            width: 2560,
            height: 1080,
         });
        await page.goto(url, {
            timeout: 20000,
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
        })

        for (let index = 0; index < 100; index++) {
            console.log("inicio scroll", index)
            await scrollBottom(page)
            //await page.waitForTimeout(3000)
        }

        await page.screenshot({ path: 'odysee.png', clip : { x: 0, y: 0, width:2560, height: 1080, scale: 1 }});
        
        const odysee = await page.evaluate(() => {
            var links =[]
            var div_videos = document.querySelectorAll(".card.claim-preview--tile")
            for (var i=0; i<div_videos.length; i++){
               let link = div_videos[i].querySelector("a").getAttribute("href")
               link = "https://odysee.com"+link
               links.push(link)
            }
            return links
      
        })
      
         
         
        //console.log("odysee", odysee)
        
        return odysee


    }catch(error){
        console.log("error scrap youtube", error)
    }finally{
        if (browser) {
           browser.close();
       }
   }
}

async function scrape(url, platform){
    if (platform == "youtube"){        
        let youtube = await scrapYoutube(url)
        //console.log("youtube", youtube)
        youtube = reverseArr(youtube)
        console.log("youtube", url)
        var json = JSON.stringify(youtube);
        fs.writeFileSync('youtube.json', json);
        return youtube
    }
    if (platform == "rumble"){
      
      let rumble = await scrapRumbel(url)
      rumble = reverseArr(rumble)
      var json = JSON.stringify(rumble);
      fs.writeFileSync('rumble.json', json);
      return rumble
    }

    if (platform == "odysee"){
        console.log("odysee")
        let odysee = await scrapOdysee(url)
        odysee = reverseArr(odysee)
        var json = JSON.stringify(odysee);
        fs.writeFileSync('odysee.json', json);
        return odysee
    }
}

async function inicilizaRobo(json) {
    try {
        console.log("cheguei aqui",json)
        // abre o browser e pega os links
        const links = await scrape(json.url, json.platform)
        let auto_import = await db('auto_import').where({user_id: json.user_id, platform: json.platform}).first()
        console.log("auto_import", auto_import)
        if (!auto_import){
            await db('auto_import')
                .insert({
                    user_id: json.user_id,
                    url: json.url,
                    platform: json.platform
                })
        }else{
            await db('auto_import')
                .update({
                    user_id: json.user_id,
                    url: json.url,
                    platform: json.platform
                }).where({id: auto_import.id})
            }

        console.log("links", links)

        if (links.length){
            for (let index = 0; index < links.length; index++) {
                const element = links[index];

                if (json.platform == "youtube"){
                    const encode =  encodeURIComponent(element)
                    await axios.get(`https://ancaptube.com/aj/user/import_youtube?user_id=${json.user_id}&youtube_id=${encode}`
                        
                    ).then(async function  (response) {
                        //console.log(response.data)
                        return true;
                    }).catch(function (error) {      
                            console.log("deu erro", error);
                    })
                }
                if (json.platform == "rumble"){
                    const encode =  encodeURIComponent(element)
                    await axios.get(`https://ancaptube.com/aj/user/import_rumble?user_id=${json.user_id}&rumble=${encode}`
                       
                    ).then(async function  (response) {
                       //console.log(response.data)
                       return true;
                    }).catch(function (error) {      
                          console.log("deu erro", error);
                    })
                }

                if (json.platform == "odysee"){
                    const encode =  encodeURIComponent(element)
                    await axios.get(`https://ancaptube.com/aj/user/import_odysee?user_id=${json.user_id}&odysee=${encode}`
                       
                    ).then(async function  (response) {
                       //console.log(response.data)
                       return true;
                    }).catch(function (error) {      
                          console.log("deu erro", error);
                    })
                 }

            }
        }
        console.log("terminou a url:" + json.url )
    } catch (error) {
        console.log("error incializaRobo", error)
    }
    
}


app.post('/nodeapp', async function (req, res) {

    try {
        console.log("req.body", req.body)

        json_body = req.body

        let platform = ""
        let url = json_body.url
        if (url.includes("youtube"))
            platform = "youtube"
        else if (url.includes("rumble"))
            platform = "rumble"
        else if (url.includes("odysee"))
            platform = "odysee"
        else if (url.includes("bitchute"))
            platform = "bitchute"

        if (platform) {
            json_body.platform = platform
            if (!json_body.user_id)
                return res.status(401).send("Need user id")

            inicilizaRobo(json_body)
            return res.status(200).json('ok')
        }

        return res.status(401).send("Don't suport this url")
    } catch (error) {
        console.log("error", error)
        return res.status(401).send("Error")
    }
    

});

app.post('/nodeapp/remove', async function (req, res) {
    try {
        const {url, user_id} = req.body;
        console.log("remove ",req.body)
        if (user_id) {
            await db('auto_import').where({url, user_id}).del()
            
            return res.json('ok')
        } else {
            return res.json("ok");
        }
    } catch (error) {
        console.log("error", errror)
        return res.status(200).json();
    }
    
})

app.get('/nodeapp/user/:id', async function (req, res) {
    const {
        id
    } = req.params
    console.log(req.params)
    if (id) {
        const user = await getImportById(id)
        console.log("user", user)
        return res.json(user);
    } else {
        return res.json("vazio");
    }

})

async function getImportById(id) {
    try {
        let result = await db('auto_import').where({user_id: id})
        
        return result
    } catch (error) {
        console.log("error get video id", error)
    }
 


    return result;
}
app.post('/nodeapp/get-description', async (req, res) => {
    let browser = null;
    console.log("veio")
    console.log("req body", req.body)

    try {
        const {
            url
        } = req.body
        browser = await createBrowser();
        const page = await browser.newPage();
        // console.log("abriu a pagina")
        await page.goto(url, {
            timeout: 10000,
            waitUntil: ['networkidle2']
        })
        let description = null
        // console.log("carregou a pagina", url)
        if (url.includes('odysee')) {

            await page.waitForSelector('.mediaInfo__description');

            description = await page.evaluate(function () {
                return document.querySelector('.mediaInfo__description').innerHTML
            })

        }
        if (url.includes('rumble')) {

            await page.waitForSelector('.media-description');

            description = await page.evaluate(function () {
                return document.querySelector('.media-description').innerHTML
            })

        }

        if (url.includes('bitchute')) {

            await page.waitForSelector('#video-description');

            description = await page.evaluate(function () {
                return document.querySelector('#video-description').innerHTML
            })

        }

        return res.json(description);

    } catch (error) {
        if (!res.headersSent) {
            res.status(400).send(error.message);
        }
    } finally {
        if (browser) {
            browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})