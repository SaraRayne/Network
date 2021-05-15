import json
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator

from .models import User, Post, Follow, Like

def index(request):
    if request.user.is_authenticated:
        return render(request, "network/index.html")
    else:
        return render(request, "network/login.html")

def posts(request, page):
    if page == "All Posts":
        # Retrieve all posts and limit to 10 per page
        posts = Post.objects.all()
        posts = posts.order_by("-timestamp").all()

        paginator = Paginator(posts, 10)
        total = paginator.num_pages

        # Grab requested page number
        page_number = request.GET.get("number")
        page_obj = paginator.get_page(page_number)

        posts = list(page_obj)

    elif page == "Following":
        following = []

        # Filter by all people current user follows
        for e in Follow.objects.filter(follower=request.user):
            following.append(e.following)

        # If user is not following anyone, return
        if not following:
            return JsonResponse({"message": "User does not follow anyone."}, status=200)

        # Get posts for every user in 'following' list
        for user in following:
            posts = Post.objects.filter(poster__in=following)
            posts = posts.order_by("-timestamp").all()

        paginator = Paginator(posts, 10)
        total = paginator.num_pages

        page_number = request.GET.get("number")
        page_obj = paginator.get_page(page_number)

        posts = list(page_obj)

    else:
        return JsonResponse({"error": "Invalid page."}, status=400)

    return JsonResponse({'posts': [post.serialize() for post in posts], 'total': total}, safe=False)


def profile(request, user):

    # Get id of user w/ this username
    id = User.objects.get(username=user).id

    # Get posts by that user
    posts = Post.objects.filter(poster=id)

    posts = posts.order_by("-timestamp").all()

    paginator = Paginator(posts, 10)
    total = paginator.num_pages

    page_number = request.GET.get("number")
    page_obj = paginator.get_page(page_number)

    posts = list(page_obj)

    return JsonResponse({'posts': [post.serialize() for post in posts], 'total': total}, safe=False)


def followers(request, user):

    # Get id of profile owner's username
    id = User.objects.get(username=user).id

    # Get all followers for selected user
    followers = Follow.objects.filter(following=id)
    return JsonResponse([follower.serialize() for follower in followers], safe=False)


def following(request, user):

    # Get id of profile owner's username
    id = User.objects.get(username=user).id

    # Get all profiles selected user is following
    following = Follow.objects.filter(follower=id)
    return JsonResponse([followed.serialize() for followed in following], safe=False)


@csrf_exempt
def follow_status(request):
    # Updating follower status must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    data = json.loads(request.body)

    # Get content of POST
    profile = data.get("profile", "")
    action = data.get("action", "")
    print(profile)

    # Get id of profile to follow
    user = User.objects.get(username=profile)

    # if following, add to database
    if action == "Follow":
        # Add new entry to Follow database
        follow = Follow(follower=request.user, following=user)
        follow.save()
    # if unfollowing, remove from database
    elif action == "Unfollow":
        # Remove entry from Follow database
        Follow.objects.filter(follower=request.user, following=user).delete()
    else:
        return JsonResponse({"error": "Action must be Follow or Unfollow."}, status=400)

    return JsonResponse({"message": "Status saved successfully."}, status=201)


@csrf_exempt
def new_post(request):

    # Composing a new post must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    data = json.loads(request.body)

    # Get content of post
    content = data.get("content", "")

    # Save post to database
    print(content)
    post = Post(content=content, poster=request.user)
    post.save()

    return JsonResponse({"message": "Post saved successfully."}, status=201)


@csrf_exempt
def edit(request, id):
    # Retrive post to be edited
    try:
        post = Post.objects.get(id=id)
        print(post)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found."}, status=404)

    # Return post contents
    if request.method == "GET":
        return JsonResponse(post.serialize())

    # Update post contents
    if request.method == "POST":

        data = json.loads(request.body)

        content = data.get("content", "")
        post.content = content
        post.save()

        return JsonResponse({"message": "Update saved successfully."}, status=201)


@csrf_exempt
def like_unlike(request, id):
    if request.method == "GET":
        # Check if user has liked post
        try:
            status = Like.objects.get(post=id, user=request.user)
        # Flags if user has not liked post
        except Like.DoesNotExist:
            print (f'User has not liked post {id}')
            return JsonResponse({"status": False}, safe=False)

        print(f'{id}, {status}')
        return JsonResponse({"status": True}, safe=False)

    if request.method == "POST":
        data = json.loads(request.body)
        id = data.get("post", "")
        action = data.get("action", "")

        # Add entry to Like model
        try:
            post = Post.objects.get(id=id)
        except Post.DoesNotExist:
            return JsonResponse({"error": "Post not found."}, status=404)

        if action == "Like":
            # Add one to Post model likes field
            post.likes += 1
            post.save()

            # Record like in database
            like = Like(user=request.user, post=post)
            like.save()

        elif action == "Unlike":
            # Remove one from Post model likes field
            post.likes -= 1
            post.save()

            # Remove like from database
            Like.objects.filter(user=request.user, post=post).delete()
        else:
            return JsonResponse({"error": "Action must be Follow or Unfollow."}, status=400)

        return JsonResponse({"message": "Like/Unlike saved successfully."}, status=201)


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")
