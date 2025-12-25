---
layout: default
title: Home
---
<h1>{{ site.title }}</h1>

<ul class="post-list">
{% for post in site.posts %}
  <li>
    <span class="date">{{ post.date | date: "%Y-%m-%d" }}</span>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  </li>
{% endfor %}
</ul>
