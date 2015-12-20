function main() {
    $("input:radio[name=direction]").click(function() {
        dir = $(this).val();
        window.oldQuery = "";
        refresh_wordlist();
    });
    $("#searchbox").change(refresh_wordlist);
    $("input:radio[name=direction][value=ido-eng]").click();
    setTimeout(refresh_wordlist, 500);
    window.oldQuery = "";
}

function make_link(keyword, articleIds) {
    return "<a href=\"javascript:load_articles('"+articleIds.join(",")+"')\">"+keyword+"</a>";
}

function recursive_enumerate(prefix, trieNode, limit, results) {
    for (var key in trieNode) {
        var value = trieNode[key];
        if (value.constructor == Array) {
            results.push([prefix+key, value]);
        } else if (value!=="ext") {
            recursive_enumerate(prefix+key, value, limit, results);
        }
        if (results.length >= limit) break;
    }
}

function refresh_wordlist() {
    var query = $("#searchbox").val();
    if (query!=oldQuery && query!="") {
        oldQuery = query;
        var trie = dictionaries[dir].index;
        var exactMatches = [];
        var partial = [];
        var trieNode = trie;
        var notExists = false;
        var partialMatches = [];
        for (var i=0; i<query.length; i++) {
            var ch = query.charAt(i);
            if (!trieNode.hasOwnProperty(ch)) {
                // no deeper trie char-nodes
                notExists = true;
                // our last chance is that there's an appropriate tail-node
                var tail1 = query.substr(i);
                for (var key in trieNode) {
                    if (key.length>1 && key.substr(0, tail1.length)==tail1) {
                        partialMatches.push([query.substr(0,i)+key, trieNode[key]]);
                        break;
                    }
                }
                break;
            }
            if (trieNode[ch].constructor == Number) {
                // check for external index chunk
                var chunkId = ""+trieNode[ch];
                while (chunkId.length<4) {
                    chunkId = "0"+chunkId;
                }
                if (dictionaries[dir].indexChunks.hasOwnProperty(chunkId)) {
                    trieNode = dictionaries[dir].indexChunks[chunkId];
                } else {
                    $("#words")[0].innerHTML = "<i>Loading index branch...<i>";
                    // load external index chunk
                    load_jsonp(dir+"/index/"+chunkId+".js");
                    // force update as soon as index is loaded
                    oldQuery = "";
                    setTimeout(refresh_wordlist, 100);
                    return;
                }
            } else {
                trieNode = trieNode[ch];
            }
            var tail = query.substr(i+1);
            if (trieNode.hasOwnProperty(tail) && trieNode[tail].constructor == Array) {
                exactMatches.push([query, trieNode[tail]]);
            }
        }
        if (!notExists) {
            recursive_enumerate(query, trieNode, 100, partialMatches);
        }
        if (partialMatches.length>=50) {
            var len = partialMatches.length>=100 ? "100+" : partialMatches.length;
            res = len + " matching words found";
        } else if (partialMatches.length == 0) {
            res = "No matching words found";
        } else{
            for (var i=0; i<partialMatches.length; i++) {
                var entry = partialMatches[i];
                partial.push(make_link(entry[0], entry[1]));
            }
            res = partial.join(" · ");
        }
        $("#words")[0].innerHTML = res;
        if (exactMatches.length > 0) {
            var articleIds = exactMatches[0][1];
            load_articles(articleIds.join(","));
        } else {
            fade_articles();
        }
    }
    setTimeout(refresh_wordlist, 500);
}

function load_jsonp(name) {
    var headID = document.getElementsByTagName("head")[0];
    var script = document.createElement('script');
    script.src = name;
    headID.appendChild(script);
}

function load_articles(idsByComma) {
    var ids = idsByComma.split(",");
    var loading = false;
    for (var i=0; i<ids.length; i++) {
        var id = ids[i];
        var base = Math.floor(id/200);
        if (!dictionaries[dir].articleChunks.hasOwnProperty(base)) {
            baseText = ""+base;
            while (baseText.length<4) {
                baseText = "0"+baseText;
            };
            load_jsonp(dir+"/articles/"+baseText+".js");
            loading = true;
        }
    }
    if (loading) {
        $("#content")[0].innerHTML = "<i>Loading...</i>";
        setTimeout(function(){actually_load_articles(ids)}, 200);
    } else {
        actually_load_articles(ids);
    }
}

function fade_articles() {
    $("#content").addClass("fade");
}

function actually_load_articles(ids) {
    var res = [];
    var loading = false;
    for (var i=0; i<ids.length; i++) {
        var id = ids[i];
        var base = Math.floor(id/200);
        var rem = id % 200;
        if (dictionaries[dir].articleChunks.hasOwnProperty(base)) {
            res.push(dictionaries[dir].articleChunks[base][rem]);
        } else {
            loading = true;
        }
    }
    if (loading) {
        res.push("<i>Loading...</i>");
        setTimeout(function(){actually_load_articles(ids)}, 200);
    }
    $("#content")[0].innerHTML = res.join("<hr>");
    $("#content").removeClass("fade");
}


dir = null;
$(document).ready(main);



