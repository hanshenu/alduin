import * as React from "react";

import { ComponentsRefs } from "./../../components-refs";
import { CustomComponent } from "./../custom-component";
import { Http } from "./../../util/http";
import { FeedParser } from "./../../util/feed-parser";
import { StoredFeed, FeedStorage } from "./../../storage";

import { remote } from "electron";
const { Menu, MenuItem } = remote;

export class Feed extends CustomComponent<FeedProp, FeedState>{

    unreadNb: number = 0;

    constructor(props: FeedProp) {
        super();

        this.props = props;

        this.state = {
            articles: this.props.articles,
            selected: false
        };

        this.handleSelect = this.handleSelect.bind(this);
        this.handleRightClick = this.handleRightClick.bind(this);
        this.onDragStart = this.onDragStart.bind(this);
    }

    fetch() {
        return new Promise<number>((resolve, reject) => {
            Http.get(this.props.link).then(xmlContent => {
                resolve(this.mergeArticles(FeedParser.parse(xmlContent)));
                ComponentsRefs.feedList.updateTrayIcon();
            }).catch(reject);
        });
    }

    render() {
        this.unreadNb = this.state.articles.filter(article => {
            return !article.read;
        }).length;

        return (
            <li
                className={this.state.selected && "selected"}
                onClick={this.handleSelect}
                onContextMenu={this.handleRightClick}
                draggable={true}
                onDragStart={this.onDragStart}
            >
                <i className="fa fa-rss"></i>
                <span className="title">{this.props.title}</span>
                <span className="notif" style={{ display: !this.unreadNb && "none" }}>{this.unreadNb}</span>
            </li>
        );
    }

    handleSelect(event: React.MouseEvent<HTMLLIElement>) {
        if (!this.state.selected) {
            ComponentsRefs.feedList.feedComponents.forEach(feedComponent => { feedComponent.editState({ selected: false }); });
            this.editState({ selected: true });

            ComponentsRefs.feedList.selectedFeed = this;

            ComponentsRefs.articleList.updateArticles(this.state.articles);

            ComponentsRefs.articleList.resetScrollbar();
        }
    }
    handleRightClick(event: React.MouseEvent<HTMLLIElement>) {
        const menu = new Menu();
        menu.append(new MenuItem({
            label: "Mark as read",
            click: () => {
                this.editState(
                    {
                        articles: this.state.articles.map(article => {
                            article.read = true;
                            return article;
                        })
                    }
                );
                ComponentsRefs.articleList.updateArticles(this.state.articles);
                FeedStorage.store();
            }
        }));
        menu.popup();
    }

    getStoreValue(): StoredFeed {
        return {
            uuid: this.props.uuid,
            title: this.props.title,
            link: this.props.link,
            articles: this.state.articles
        };
    }

    mergeArticles(newArticles: IArticle[]) {
        let newArticleNb = 0;
        const newArticlesList = this.state.articles.slice(0);
        for (let i = 0; i < newArticles.length; i++) {
            if (this.getArticleByID(newArticles[i].id)) continue;

            newArticles[i].read = false;
            newArticlesList[newArticlesList.length] = newArticles[i];
            newArticleNb++;
        }

        newArticlesList.sort((articleA, articleB) => {
            return articleA.date > articleB.date ? -1 : 1;
        });

        this.editState({ articles: newArticlesList });

        ComponentsRefs.feedList.selectedFeed === this && ComponentsRefs.articleList.updateArticles(newArticlesList); // Code like if you were in Satan's church

        return newArticleNb;
    }

    getArticleByID(id: string) {
        return this.state.articles.find(article => {
            return article.id == id;
        });
    }

    onDragStart(event: React.DragEvent<HTMLElement>) {
        event.dataTransfer.setData("text/plain", JSON.stringify({
            uuid: this.props.uuid,
            wasSelected: this.state.selected
        }));
    }
}

export interface FeedProp {
    uuid: string;
    title: string;
    link: string;
    articles: IArticle[];
}
interface FeedState {
    articles: IArticle[];
    selected: boolean;
}

export interface IArticle {
    id: string;
    title: string;
    content: string;
    link: string;
    date: number;
    read?: boolean;
    podcast?: string;
}
