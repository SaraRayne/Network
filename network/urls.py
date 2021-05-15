
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),

    # API routes
    path("new_post", views.new_post, name="new_post"),
    path("follow_status", views.follow_status, name="follow_status"),
    path("like/<int:id>", views.like_unlike, name="like_unlike"),
    path("posts/<str:page>", views.posts, name="posts"),
    path("edit/<int:id>", views.edit, name="edit"),
    path("profiles/<str:user>", views.profile, name="profile"),
    path("followers/<str:user>", views.followers, name="followers"),
    path("following/<str:user>", views.following, name="following")
]
