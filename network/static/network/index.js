document.addEventListener('DOMContentLoaded', function() {

    // Toggle between 'pages'
    document.querySelector('#all-posts').addEventListener('click', () => load_page('All Posts', 1));
    document.querySelector('#profile').addEventListener('click', () => load_page('Profile', 1));
    document.querySelector('#following').addEventListener('click', () => load_page('Following', 1));

    // Go back one page
    document.querySelector('#previous').addEventListener('click', function(event) {
        page = document.querySelector('#heading');
        page = page.getAttribute('name');
        number = parseInt(event.target.name);
        load_page(page, number)
        event.target.name--;
        document.querySelector('#next').name--;
    });

    // Go to the next page
    document.querySelector('#next').addEventListener('click', function(event) {
        page = document.querySelector('#heading');
        page = page.getAttribute('name');
        load_page(page, event.target.name)
        event.target.name++;
        document.querySelector('#previous').name++;
    });

    // By default, load All Posts page
    load_page('All Posts', 1)

    // Select the submit button and input to be used later
    const submit = document.querySelector('#submit');
    const new_post = document.querySelector('#create-post');

    // Disable submit button by default:
    submit.disabled = true;

    // Listen for input to be typed into the input field
    new_post.onkeyup = () => {
        if (new_post.value.length > 0) {
            submit.disabled = false;
        }
        else {
            submit.disabled = true;
        }
    }

    // Controls the creation of new posts
    document.querySelector('#post-form').onsubmit = function () {
        let content = document.querySelector('#create-post').value;

        fetch('/new_post', {
            method: 'POST',
            body: JSON.stringify({
                content: content
            })
        })
        .then(response => response.json())
        .then(result => {
            console.log(result);
            load_page('All Posts');
        })
        .catch(error => alert(error.message));
        document.querySelector('#post-form').reset();
        return false;
    }

    // Controls the follow/unfollow functionality
    document.querySelector('#follow-form').onsubmit = function () {
        let profile = document.querySelector('#heading').innerText;
        let action = document.querySelector('#follow-unfollow').innerText;

        fetch('/follow_status', {
            method: 'POST',
            body: JSON.stringify({
                profile: profile,
                action: action
            })
        })
        .then(response => response.json())
        .then(result => {
            console.log(result);
            profile_page(profile)
        })
        .catch(error => alert(error.message));

        return false;
    }

});


// Loads pages
function load_page(page, page_number) {

    var heading = document.querySelector('#heading')
    heading.innerHTML = `<h1>${page}</h1>`
    heading.setAttribute('name', `${page}`);
    document.querySelector('#new-post').style.display = 'block';
    document.querySelector('#profile-view').style.display = 'none';
    document.querySelector('#follow-unfollow').style.display = 'none';
    document.querySelector('#posts').innerHTML = '';

    console.log(page_number);

    // Hide previous button if one page 1
    if (page_number === 1) {
        document.querySelector('#previous').style.display = 'none';
    } else {
        document.querySelector('#previous').style.display = 'inline-block';
    }

    // Retrieve posts for All Posts or Following page
    if (page === 'All Posts' || page === 'Following') {
        fetch(`/posts/${page}?number=${page_number}`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            var i;
            for (i = 0; i < data.posts.length; i++) {

                // Retrieve values for posts
                let poster = data.posts[i].poster
                let content = data.posts[i].content
                let likes = data.posts[i].likes
                let timestamp = data.posts[i].timestamp
                let id = data.posts[i].id

                // Create new div block for posts
                const div = document.createElement('div');
                div.className = "post-div";

                // Create link to user profile
                let profile_link = document.createElement('a');
                profile_link.setAttribute('href', '#');
                profile_link.setAttribute('id', `${poster}`);
                profile_link.setAttribute('class', 'profile-link');
                profile_link.innerText = `${poster}`

                // Add user profile link to div
                div.appendChild(profile_link);

                // Add post data to new div
                div.innerHTML += `&nbsp &nbsp <span id="content-span-${id}">${content}</span> Date: ${timestamp} &nbsp &nbsp Likes: <span id="likes-span-${id}">${likes}</span> &nbsp &nbsp`;

                // Go to profile of user when username clicked
                div.addEventListener('click', function(event) {
                    let target = event.target;
                    if (event.target.id === `${poster}`) {
                        console.log(event.target.id);
                        profile_page(event.target.id)
                    }
                });

                // Create Like/Unlike functionality
                let like = document.createElement('a');
                like.setAttribute('href', '#');
                like.setAttribute('name', `${id}`);
                like.setAttribute('id', `like${id}`);
                // Check if user has already liked post
                fetch(`like/${id}`)
                .then(response => response.json())
                .then(status => {
                    if (status.status === false) {
                        like.innerText = "Like";
                    } else {
                        like.innerText = "Unlike";
                    }
                })
                div.appendChild(like);
                // Update like status on click
                like.addEventListener('click', function(event) {
                    like_unlike(like.name);
                });

                // Set active user
                const activeUser = document.querySelector('#profile').text

                // Add edit button to posts belonging to user
                if (poster === activeUser) {
                    let edit_button = document.createElement('button');
                    edit_button.setAttribute('id', `${id}`)
                    edit_button.setAttribute('class', 'btn btn-secondary')
                    edit_button.innerText = 'Edit'
                    div.appendChild(edit_button);
                    edit_button.addEventListener('click', () => edit(id));

                }

                // Add contents of new div to existing page div
                document.querySelector('#posts').append(div);

            }

            // Hide next button on last page
            if ((document.querySelector('#next').name) - 1 === data.total) {
                document.querySelector('#next').style.display = 'none';
            } else {
                document.querySelector('#next').style.display = 'inline-block';
            }

        })
        .catch(error => {
            console.log(error);
            document.querySelector('#next').style.display = 'none';
        });
    }

    // Send to profile loading function if user clicks their profile page
    if (page === 'Profile') {
        username = document.getElementById('profile').text;
        profile_page(username, page_number)
    }

}


// Loads profile page
function profile_page(user, page_number) {

    // Hide/show appropriate sections
    document.querySelector('#heading').innerHTML = `<h1>${user}</h1>`;
    document.querySelector('#follow-unfollow').style.display = 'none';
    document.querySelector('#profile-view').style.display = 'block';
    document.querySelector('#new-post').style.display = 'none';
    document.querySelector('#posts').innerHTML = "";

    // Create variable for current user
    const activeUser = document.querySelector('#profile').text

    // Add number of followers to profile view, along with correct button
    fetch(`followers/${user}`)
    .then(response => response.json())
    .then(followers => {
        // Add number of followers to element
        document.querySelector('#followers-num').innerHTML = `<h5>Followers: ${followers.length}</h5>`;
        // If profile does not belong to logged in user, show follow/unfollow button
        if (activeUser !== user) {
            // Find out if user already follows and show appropriate button
            if (followers.some(item => item.follower === activeUser) ===  true) {
                document.querySelector('#follow-unfollow').style.display = 'block';
                document.querySelector('#follow-unfollow').innerHTML = 'Unfollow';
            } else {
                document.querySelector('#follow-unfollow').style.display = 'block';
                document.querySelector('#follow-unfollow').innerHTML = 'Follow';
            }
        }
    })

    // Add number following to profile view
    fetch(`following/${user}`)
    .then(response => response.json())
    .then(following => {
        // Add number of following to element
        document.querySelector('#following-num').innerHTML = `<h5>Following: ${following.length}</h5>`;
    })

    // Fetch posts by selected user
    fetch(`/profiles/${user}?number=${page_number}`)
    .then(response => response.json())
    .then(data => {
        console.log(data);
        var i;
        for (i = 0; i < data.posts.length; i++) {

            // Retrieve values for posts
            let content = data.posts[i].content
            let likes = data.posts[i].likes
            let timestamp = data.posts[i].timestamp
            let id = data.posts[i].id

            // Create new div block for posts
            const div = document.createElement('div');
            div.className = "post-div";

            // Add post data to new div
            div.innerHTML += `${content} &nbsp &nbsp Date: ${timestamp} &nbsp &nbsp Likes: ${likes}`;

            // Add edit button to posts
            let edit_button = document.createElement('button');
            edit_button.setAttribute('id', `${id}`)
            edit_button.setAttribute('class', 'btn btn-secondary')
            edit_button.innerText = 'Edit'
            div.appendChild(edit_button);
            edit_button.addEventListener('click', () => edit(id));

            // Add contents of new div to existing page div
            document.querySelector('#posts').append(div);
        }

        // Hide next button on last page
        if ((document.querySelector('#next').name) - 1 === data.total) {
            console.log("On last page")
            document.querySelector('#next').style.display = 'none';
        } else {
            console.log("Not on last page")
            document.querySelector('#next').style.display = 'inline-block';
        }

    })
}


// Allows user to edit their posts
function edit(id) {
    // Hide post being edited
    document.getElementById(id).style.display = 'none';

    // Grab current content and update it
    fetch(`/edit/${id}`)
    .then(response => response.json())
    .then(post => {
        let content = post.content;
        let current_content = document.querySelector(`#content-span-${id}`)
        current_content.innerHTML = `<form id="edit-form"><textarea id="edited">${content}</textarea><input type="submit"></form>`
        document.querySelector('#edit-form').onsubmit = function () {
            let new_content = document.querySelector('#edited').value;
            console.log(new_content);
            fetch(`/edit/${id}`, {
                method: 'POST',
                body: JSON.stringify({
                    content: new_content
                })
            })
            .then(response => response.json())
            .then(result => {
                console.log(result);
                current_content.innerHTML = new_content;
                document.getElementById(id).style.display = 'inline-block';
            })
            .catch(error => alert(error.message));
            return false;
        }
    })
}


// Allows users to like/unlike posts
function like_unlike(id) {
    console.log(id);
    let action = document.querySelector(`#like${id}`).innerText;
    fetch(`like/${id}`, {
        method: 'POST',
        body: JSON.stringify({
            post: id,
            action: action
        })
    })
    .then(response => response.json())
    .then(result => {
        console.log(result);
        page = document.querySelector('#heading');
        page = page.getAttribute('name');
        load_page(page, 1)
        // Maybe change this to grab the action and value of likes then change based on those
        // ex. if action is like, should change text to unlike and +1 to likes
    })
}
